import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import { Nullability } from "@specs-feup/coral/symbol/Nullability";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import Access from "@specs-feup/coral/mir/action/Access";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import PreconditionViolationError from "@specs-feup/coral/error/null_safety/PreconditionViolationError";
import Fn from "@specs-feup/coral/mir/symbol/Fn";

export type NullabilityState = Map<string, Nullability>;

export default class NullabilityAnalyser {
    private fn: CoralFunctionNode.Class;
    private nodeStates: Map<string, NullabilityState> = new Map();
    // Tracks temporary variables back to their originals (e.g., __coral_var_0 -> p)
    private aliasMap: Map<string, string> = new Map();

    constructor(fn: CoralFunctionNode.Class) {
        this.fn = fn;
    }

    /**
     * Follows the chain of assignments to find the source variable name.
     * e.g., if __coral_var_2 was assigned from __coral_var_0, and that was from 'p', 
     * this returns 'p'.
     */
    #resolveToOriginal(name: string): string {
        let current = name;
        let depth = 0;
        while (this.aliasMap.has(current) && depth < 10) {
            current = this.aliasMap.get(current)!;
            depth++;
        }
        return current;
    }

    analyze(): Map<string, NullabilityState> {
        const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);
        let currentState: NullabilityState = new Map();
        this.aliasMap.clear();

        // 1. Initialize State from Entry Contracts
        for (const param of fnSymbol.params) {
            const initial = param.initialNullability ?? Nullability.MAYBE_NULL;
            currentState.set(param.jp.name, initial);
        }

        // 2. Traverse the CFG Nodes
        for (const node of this.fn.controlFlowNodes.filterIs(CoralCfgNode)) {
            const $jp = node.jp;
            
            // Safety check: skip nodes that don't have associated code (like some internal flow nodes)
            if (!$jp || typeof $jp.code !== 'string') {
                this.nodeStates.set(node.id, new Map(currentState));
                continue;
            }

            const code = $jp.code;

            // --- A. ALIAS TRACKING ---
            // If the code is a simple assignment like: __coral_var_0 = p;
            if (code.includes("=") && !code.includes("==") && !code.includes("!=") && !code.includes("*")) {
                const parts = code.split("=").map(s => s.trim().replace(";", ""));
                if (parts.length > 1) {
                    const lhs = parts[0];
                    const rhs = parts[1];
                    // Map temporary variables to their source
                    if (currentState.has(rhs) || rhs.startsWith("__coral_var")) {
                        this.aliasMap.set(lhs, rhs);
                    }
                }
            }

            // --- B. GUARD REFINEMENT (The 'if (p == NULL) return' logic) ---
            const $if = $jp.getAncestor("if") as any;
            if ($if?.condition && $if?.then?.code?.includes("return")) {
                // If the "then" branch exits, the "else" (fallthrough) path guarantees p is NOT_NULL
                const condCode = $if.condition.code;
                
                // Extract the variable being compared. We resolve through aliases to find 'p'
                const rawVar = condCode.split("==")[0].trim().replace(/[()]/g, "");
                const realVar = this.#resolveToOriginal(rawVar);

                if (currentState.has(realVar)) {
                    currentState.set(realVar, Nullability.NOT_NULL);
                    console.log(`[Nullck] Refined ${realVar} to NOT_NULL (passed guard)`);
                }
            }

            // --- C. WRITES & PROPAGATION ---
            for (const access of node.accesses) {
                if (access.kind === Access.Kind.WRITE) {
                    const targetName = access.path.toString().trim();
                    const state = this.#resolveRhsState($jp, currentState);
                    currentState.set(targetName, state);
                }
            }

            // --- D. PRE-CONDITION CHECKS (Calls) ---
            this.#checkFunctionCalls(node, currentState);

            // --- E. POST-CONDITION CHECKS (Returns/End) ---
            if (node.is(ReturnNode) || node.is(ControlFlowEndNode) || code.includes("return")) {
                this.#verifyExitContracts(fnSymbol, currentState);
            }

            this.nodeStates.set(node.id, new Map(currentState));
        }

        return this.nodeStates;
    }

    #resolveRhsState($jp: any, state: NullabilityState): Nullability {
        const code = $jp.code;
        
        // 1. Literal Nulls
        if (code.includes("NULL") || code.includes("= 0") || code.includes("(void *) 0")) {
            return Nullability.NULL;
        }
        
        // 2. Memory addresses (always not null)
        if (code.includes("&")) {
            return Nullability.NOT_NULL;
        }
        
        // 3. Variable Propagations & Dereferences
        const parts = code.split("=");
        if (parts.length > 1) {
            let rhs = parts[1].replace(";", "").trim();

            // Handle x = *p
            if (rhs.startsWith("*")) {
                rhs = rhs.substring(1).trim();
                const realName = this.#resolveToOriginal(rhs);
                const pointerState = state.get(realName) ?? Nullability.MAYBE_NULL;
                // If the pointer itself is NOT_NULL, then dereferencing it is safe.
                return pointerState === Nullability.NOT_NULL ? Nullability.NOT_NULL : Nullability.MAYBE_NULL;
            }

            // Handle direct assignment: p = q
            const realName = this.#resolveToOriginal(rhs);
            return state.get(realName) ?? Nullability.MAYBE_NULL;
        }

        return Nullability.MAYBE_NULL;
    }

    #checkFunctionCalls(node: CoralCfgNode.Class, state: NullabilityState) {
        for (const call of node.calls) {
            const targetFn: Fn = (call as any).symbol; // Requires 'get symbol()' in FunctionCall
            if (!targetFn) continue;

            targetFn.params.forEach((param: any, i: number) => {
                const arg = call.jp.args[i];
                if (!arg) return;

                const argName = arg.code.trim();
                const realArgName = this.#resolveToOriginal(argName);
                const argNullability = state.get(realArgName) ?? Nullability.MAYBE_NULL;

                // Check Pre-condition
                if (param.initialNullability === Nullability.NOT_NULL && argNullability !== Nullability.NOT_NULL) {
                    throw new PreconditionViolationError(
                        call.jp, 
                        argName, 
                        targetFn.jp.name, 
                        param.initialNullability, 
                        argNullability
                    );
                }

                // Propagate Post-condition state from call back to variable
                if (param.finalNullability) {
                    state.set(realArgName, param.finalNullability);
                }
            });
        }
    }

    #verifyExitContracts(fnSymbol: FnSymbol, state: NullabilityState) {
        for (const param of fnSymbol.params) {
            const required = param.finalNullability;
            if (!required) continue;

            const actual = state.get(param.jp.name) ?? Nullability.MAYBE_NULL;

            if (required === Nullability.NOT_NULL && actual !== Nullability.NOT_NULL) {
                console.error(`[Error] Post-condition failed for '${param.jp.name}'. Expected NOT_NULL, got ${actual}`);
            }
        }
    }
}