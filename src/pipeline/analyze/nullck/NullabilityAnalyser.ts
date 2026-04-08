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
    
        // 1. Initial State
        for (const param of fnSymbol.params) {
            currentState.set(param.jp.name, param.initialNullability ?? Nullability.MAYBE_NULL);
        }
    
        // 2. CFG Walk
        for (const node of this.fn.controlFlowNodes.filterIs(CoralCfgNode)) {
            
            // Handle Assignments
            for (const access of node.accesses) {
                if (access.kind === Access.Kind.WRITE) {
                    // We use .trim() and simple matching for the variable name
                    const targetName = access.path.toString().trim();
                    const code = node.jp.code;
    
                    if (code.includes("NULL") || code.includes("0")) {
                        currentState.set(targetName, Nullability.NULL);
                    } else {
                        currentState.set(targetName, Nullability.NOT_NULL);
                    }
                }
            }
    
            // Handle Function Calls (Transitions)
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
    
            // Save state
            this.nodeStates.set(node.id, new Map(currentState));
        }
    
        // 3. Final Handover to End Nodes
        const endNodes = this.fn.controlFlowNodes.filterIs(ControlFlowEndNode);
        for (const node of endNodes) {
            // We must ensure the end node carries the final known state
            this.nodeStates.set(node.id, new Map(currentState));
        }
    
        return this.nodeStates;
    }
}