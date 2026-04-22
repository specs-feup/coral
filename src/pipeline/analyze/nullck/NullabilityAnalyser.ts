import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import { Nullability } from "@specs-feup/coral/symbol/Nullability";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import Access from "@specs-feup/coral/mir/action/Access";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import PreconditionViolationError from "@specs-feup/coral/error/null_safety/PreconditionViolationError";
//import PostconditionViolationError from "@specs-feup/coral/error/null_safety/PostconditionViolationError"; // You might need to create this
import Fn from "@specs-feup/coral/mir/symbol/Fn";

export type NullabilityState = Map<string, Nullability>;

export default class NullabilityAnalyser {
    private fn: CoralFunctionNode.Class;
    private nodeStates: Map<string, NullabilityState> = new Map();

    constructor(fn: CoralFunctionNode.Class) {
        this.fn = fn;
    }

    analyze(): Map<string, NullabilityState> {
        const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);
        let currentState: NullabilityState = new Map();

        // 1. Initialize State from Entry Contracts (The "Pre" condition)
        for (const param of fnSymbol.params) {
            const initial = param.initialNullability ?? Nullability.MAYBE_NULL;
            currentState.set(param.jp.name, initial);
        }

        // 2. Traverse the CFG
        for (const node of this.fn.controlFlowNodes.filterIs(CoralCfgNode)) {
            
            // --- A. GUARD REFINEMENT (The 'if (p == NULL) return' logic) ---
            const $jp = node.jp;
            const $if = $jp.getAncestor("if") as any;
            
            if ($if && $if.then && $if.condition) {
                const condCode = $if.condition.code;
                const thenCode = $if.then.code;

                // If the "then" branch exits the function, we refine the state for the "else" path
                if ((condCode.includes("== NULL") || condCode.includes("== 0")) && thenCode.includes("return")) {
                    const varName = condCode.split("==")[0].trim(); // Simplistic parse
                    if (currentState.has(varName)) {
                        currentState.set(varName, Nullability.NOT_NULL);
                        console.log(`[Flow] Refined ${varName} to NOT_NULL after guard.`);
                    }
                }
            }

            // --- B. ASSIGNMENTS / WRITES ---
            for (const access of node.accesses) {
                if (access.kind === Access.Kind.WRITE) {
                    const targetName = access.path.toString();
                    currentState.set(targetName, this.#resolveRhsState(node.jp, currentState));
                }
            }

            // --- C. FUNCTION CALLS (Pre-condition Check) ---
            this.#checkFunctionCalls(node, currentState);

            // --- D. EXIT POINT CHECK (The "Post" condition) ---
            // If this node is a Return or the End of the function, check the contract
            if (node.is(ReturnNode) || node.is(ControlFlowEndNode)) {
                this.#verifyExitContracts(fnSymbol, currentState, node.jp);
            }

            this.nodeStates.set(node.id, new Map(currentState));
        }

        return this.nodeStates;
    }

    #resolveRhsState($jp: any, state: NullabilityState): Nullability {
        const code = $jp.code;
        if (code.includes("NULL") || code.includes("= 0")) return Nullability.NULL;
        if (code.includes("&")) return Nullability.NOT_NULL;
        
        // Handle variable propagation: p = q;
        const parts = code.split("=");
        if (parts.length > 1) {
            const rhs = parts[1].replace(";", "").trim();
            return state.get(rhs) ?? Nullability.MAYBE_NULL;
        }
        return Nullability.MAYBE_NULL;
    }

    #checkFunctionCalls(node: CoralCfgNode.Class, state: NullabilityState) {
        for (const call of node.calls) {
            // Now using the getter we added above
            const targetFn: Fn = call.symbol; 
    
            if (!targetFn) continue;
    
            // Explicitly typing 'param' and 'i'
            // 'i' is always number. 'param' is the parameter object from your MIR
            targetFn.params.forEach((param: any, i: number) => {
                const arg = call.jp.args[i];
                if (!arg) return;
    
                const argName = arg.code.trim();
                const argNullability = state.get(argName) ?? Nullability.MAYBE_NULL;
    
                console.log(`[Nullck] Checking ${targetFn.jp.name}(${argName}): has ${argNullability}, needs ${param.initialNullability}`);
    
                // 1. Pre-condition Check (Entry)
                if (param.initialNullability === Nullability.NOT_NULL && argNullability !== Nullability.NOT_NULL) {
                    throw new PreconditionViolationError(
                        call.jp, 
                        argName, 
                        targetFn.jp.name, 
                        param.initialNullability, 
                        argNullability
                    );
                }
    
                // 2. State Propagation (Exit)
                // If the function contract says the parameter exits as NOT_NULL, 
                // update our flow state for that variable.
                if (param.finalNullability) {
                    state.set(argName, param.finalNullability);
                    console.log(`[Nullck] Post-call update: ${argName} is now ${param.finalNullability}`);
                }
            });
        }
    }

    #verifyExitContracts(fnSymbol: FnSymbol, state: NullabilityState, $jp: any) {
        for (const param of fnSymbol.params) {
            const requiredAtExit = param.finalNullability;
            if (!requiredAtExit) continue;

            const actualAtExit = state.get(param.jp.name) ?? Nullability.MAYBE_NULL;

            // Logic: if contract says NOT_NULL, but we are NULL or MAYBE_NULL, error!
            if (requiredAtExit === Nullability.NOT_NULL && actualAtExit !== Nullability.NOT_NULL) {
                console.error(`[Error] Post-condition failed for '${param.jp.name}'. Expected NOT_NULL, got ${actualAtExit}`);
                // throw new PostconditionViolationError(...);
            }
        }
    }
}