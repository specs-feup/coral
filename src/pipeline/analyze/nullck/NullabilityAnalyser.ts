import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import { Nullability } from "@specs-feup/coral/symbol/Nullability";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import Access from "@specs-feup/coral/mir/action/Access";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";
import PreconditionViolationError from "@specs-feup/coral/error/null_safety/PreconditionViolationError";
export type NullabilityState = Map<string, Nullability>;
import Fn from "@specs-feup/coral/mir/symbol/Fn";

export default class NullabilityAnalyser {
    private fn: CoralFunctionNode.Class;
    private nodeStates: Map<string, NullabilityState> = new Map();

    constructor(fn: CoralFunctionNode.Class) {
        this.fn = fn;
    }

    analyze(): Map<string, NullabilityState> {
        const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);
        let currentState: NullabilityState = new Map();
        console.log("haa")
        console.log(fnSymbol)
        
        for (const param of fnSymbol.params) {
            console.log(param)
            currentState.set(param.jp.name, param.initialNullability ?? Nullability.MAYBE_NULL);
        }
    
        for (const node of this.fn.controlFlowNodes.filterIs(CoralCfgNode)) {
            console.log("Node", node)
            for (const access of node.accesses) {
                console.log("Access", access);
                if (access.kind === Access.Kind.WRITE) {
                    const targetName = access.path.toString().trim();
                    const code = node.jp.code;
    
                    if (code.includes("NULL") || code.includes("0")) {
                        currentState.set(targetName, Nullability.NULL);
                    } else {
                        currentState.set(targetName, Nullability.NOT_NULL);
                    }
                }
            }
    
    
            for (const call of node.calls) {
                const targetFnSymbol: Fn = (call as any).symbol ?? this.fn.getSymbol(call.jp.function);
            
                if (!targetFnSymbol) {
                    console.log(`[Nullck-Debug] Skipping call: No symbol found for ${call.jp.code}`);
                    continue;
                }
            
                console.log(`[Nullck-Debug] Checking call to: ${targetFnSymbol.jp.name}`);
            
                targetFnSymbol.params.forEach((param, i: number) => {
                    const arg = call.jp.args[i];
                    if (!arg) return;
            
                    const argName = arg.code.trim();
                    const argNullability = currentState.get(argName) ?? Nullability.MAYBE_NULL;
            
                    console.log(`[Nullck-Debug] Arg ${i} (${argName}): State = ${argNullability}, Required = ${param.initialNullability}`);
            
                    if (param.initialNullability === Nullability.NOT_NULL && argNullability !== Nullability.NOT_NULL) {
                        throw new PreconditionViolationError(
                            call.jp, 
                            argName, 
                            targetFnSymbol.jp.name, 
                            param.initialNullability, 
                            argNullability
                        );
                    }

                    if (param.finalNullability) {
                        currentState.set(argName, param.finalNullability);
                    }
                });
            }
    
            this.nodeStates.set(node.id, new Map(currentState));
        }
    
        const endNodes = this.fn.controlFlowNodes.filterIs(ControlFlowEndNode);
        for (const node of endNodes) {
            this.nodeStates.set(node.id, new Map(currentState));
        }
    
        return this.nodeStates;
    }
}