import { Nullability } from "@specs-feup/coral/symbol/Nullability";
import { NullabilityState } from "./NullabilityAnalyser.js";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";
import ContractViolationError from "@specs-feup/coral/error/null_safety/ContractViolationError";
import PotentialNullDereferenceError from "@specs-feup/coral/error/null_safety/PotentialNullDereferenceError";
import NullDereferenceError from "@specs-feup/coral/error/null_safety/NullDereferenceError";
import PathDeref from "@specs-feup/coral/mir/path/PathDeref";

export default class NullabilityErrorReporting {
    private fn: CoralFunctionNode.Class;
    private nodeStates: Map<string, NullabilityState>;

    constructor(fn: CoralFunctionNode.Class, nodeStates: Map<string, NullabilityState>) {
        this.fn = fn;
        this.nodeStates = nodeStates;
    }

    report(): void {
        const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);

        for (const node of this.fn.controlFlowNodes.filterIs(CoralCfgNode)) {
            const state = this.nodeStates.get(node.id);
            if (!state) continue;

            for (const access of node.accesses) {
                // Only flag as a dereference if the MIR Path is actually a Dereference object
                if (access.path instanceof PathDeref) {
                    const varName = access.path.toString(); 
                    const actual = state.get(varName);
            
                    if (actual === Nullability.MAYBE_NULL) {
                        throw new PotentialNullDereferenceError(node.jp, varName);
                    } else if (actual === Nullability.NULL) {
                        throw new NullDereferenceError(node.jp, varName,actual );
                    }
                }
            }
        }
        const endNodes = this.fn.controlFlowNodes.filterIs(ControlFlowEndNode);
        for (const node of endNodes) {
            const finalState = this.nodeStates.get(node.id);
            if (!finalState) continue;

            for (const param of fnSymbol.params) {
                if (param.finalNullability) {
                    const actual = finalState.get(param.jp.name) ?? Nullability.MAYBE_NULL;
                    
                    if (this.isWeaker(actual, param.finalNullability)) {
                        throw new ContractViolationError(
                            this.fn.jp, 
                            param.jp.name, 
                            param.finalNullability, 
                            actual
                        );
                    }
                }
            }
        }
    }

    private isWeaker(actual: Nullability, required: Nullability): boolean {
        if (required === Nullability.NOT_NULL && actual !== Nullability.NOT_NULL) return true;
        if (required === Nullability.NULL && actual !== Nullability.NULL) return true;
        return false;
    }
}