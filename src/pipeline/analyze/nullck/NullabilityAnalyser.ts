import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import { Nullability } from "@specs-feup/coral/symbol/Nullability";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import Access from "@specs-feup/coral/mir/action/Access";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";
import PreconditionViolationError from "@specs-feup/coral/error/null_safety/PreconditionViolationError";
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
        
        // Initialize parameters with their declared nullability
        for (const param of fnSymbol.params) {
            currentState.set(param.jp.name, param.initialNullability ?? Nullability.MAYBE_NULL);
        }
    
        for (const node of this.fn.controlFlowNodes.filterIs(CoralCfgNode)) {

            // --- 1. GUARD REFINEMENT LOGIC ---
            // Handles: if (p == NULL) return;
            const $if = node.jp.getAncestor("if") as any;

            if ($if?.condition?.code && $if?.then?.code) {
                const conditionCode: string = $if.condition.code;
                const thenBody: string = $if.then.code;

                // Check for various NULL representations including Clava's normalization ((void *) 0)
                const isNullCheck = conditionCode.includes("== NULL") || 
                                    conditionCode.includes("== 0") || 
                                    conditionCode.includes("(void *) 0");

                if (isNullCheck && thenBody.includes("return")) {
                    // Extract the variable name being compared to NULL
                    const parts = conditionCode.split("==").map((s: string) => s.trim());
                    const varName = parts.find(p => 
                        !p.includes("NULL") && 
                        !p.includes("0") && 
                        !p.includes("void")
                    );

                    if (varName && currentState.has(varName)) {
                        console.log(`[Nullck] Guard Refinement: '${varName}' is now NOT_NULL`);
                        currentState.set(varName, Nullability.NOT_NULL);
                    }
                }
            }

            // --- 2. ASSIGNMENT / WRITE LOGIC ---
            for (const access of node.accesses) {
                if (access.kind === Access.Kind.WRITE) {
                    const targetName = access.path.toString().trim();
                    const code = node.jp.code;
                
                    if (code.includes("=")) {
                        let rhs = code.split("=")[1].replace(";", "").trim();
                        let state: Nullability = Nullability.MAYBE_NULL;

                        // Case A: Explicit NULL assignment
                        if (rhs === "0" || rhs === "NULL" || rhs.includes("(void *) 0")) {
                            state = Nullability.NULL;
                        } 
                        // Case B: Address-of operator (&var) is ALWAYS NOT_NULL
                        else if (rhs.startsWith("&")) {
                            state = Nullability.NOT_NULL;
                        }
                        // Case C: Literal numbers (e.g., 5, 10) are NOT_NULL
                        else if (!isNaN(Number(rhs))) {
                            state = Nullability.NOT_NULL;
                        }
                        // Case D: Propagation from another variable
                        else {
                            if (rhs.startsWith("*")) {
                                rhs = rhs.substring(1).trim();
                            }
                            state = currentState.get(rhs) ?? Nullability.MAYBE_NULL;
                        }

                        currentState.set(targetName, state);
                        console.log(`[Nullck] Propagating state: ${targetName} is now ${state} (from ${rhs})`);
                    }
                }
            }
    
            // --- 3. FUNCTION CALL CHECKING ---
            for (const call of node.calls) {
                const targetFnSymbol: Fn = (call as any).symbol ?? this.fn.getSymbol(call.jp.function);
            
                if (!targetFnSymbol) {
                    continue;
                }
            
                targetFnSymbol.params.forEach((param, i: number) => {
                    const arg = call.jp.args[i];
                    if (!arg) return;
            
                    const argName = arg.code.trim();
                    const argNullability = currentState.get(argName) ?? Nullability.MAYBE_NULL;
            
                    // Verify preconditions (e.g., passing NULL to a NOT_NULL param)
                    if (param.initialNullability === Nullability.NOT_NULL && argNullability !== Nullability.NOT_NULL) {
                        throw new PreconditionViolationError(
                            call.jp, 
                            argName, 
                            targetFnSymbol.jp.name, 
                            param.initialNullability, 
                            argNullability
                        );
                    }

                    // Propagate final state if the function modifies the argument's nullability
                    if (param.finalNullability) {
                        currentState.set(argName, param.finalNullability);
                    }
                });
            }
    
            // Save the state after processing the node
            this.nodeStates.set(node.id, new Map(currentState));
        }
    
        // Map states to end nodes for final validation
        const endNodes = this.fn.controlFlowNodes.filterIs(ControlFlowEndNode);
        for (const node of endNodes) {
            this.nodeStates.set(node.id, new Map(currentState));
        }
    
        return this.nodeStates;
    }
}