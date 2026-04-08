import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import { Nullability } from "@specs-feup/coral/symbol/Nullability";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import Access from "@specs-feup/coral/mir/action/Access";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode"; // Correct ESM import

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
    
        for (const param of fnSymbol.params) {
            currentState.set(param.jp.name, param.initialNullability ?? Nullability.MAYBE_NULL);
        }
    
        for (const node of this.fn.controlFlowNodes.filterIs(CoralCfgNode)) {
            
            for (const access of node.accesses) {
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
                const targetFn: FnSymbol = (call as any).symbol;
                if (!targetFn) continue;
    
                targetFn.params.forEach((param, i) => {
                    const argCode = (call.jp.args[i] as any)?.code;
                    if (argCode && param.finalNullability) {
                        currentState.set(argCode, param.finalNullability);
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