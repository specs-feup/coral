import { Nullability } from "@specs-feup/coral/symbol/Nullability";
import { NullabilityState } from "./NullabilityAnalyser.js";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode"; // Add this import

export default class NullabilityErrorReporting {
    private fn: CoralFunctionNode.Class;
    private nodeStates: Map<string, NullabilityState>;

    constructor(fn: CoralFunctionNode.Class, nodeStates: Map<string, NullabilityState>) {
        this.fn = fn;
        this.nodeStates = nodeStates;
    }

    report(): void {
        const fnSymbol: FnSymbol = this.fn.getSymbol(this.fn.jp);

        // Find the specific node that represents the end of the function
        const endNodes = this.fn.controlFlowNodes.filterIs(ControlFlowEndNode);
        
        for (const node of endNodes) {
            const finalState = this.nodeStates.get(node.id);
            if (!finalState) continue;

            for (const param of fnSymbol.params) {
                if (param.finalNullability) {
                    const actual = finalState.get(param.jp.name);
                    
                    if (this.isWeaker(actual, param.finalNullability)) {
                        this.logError(
                            `Contract Violation: Parameter '${param.jp.name}' was promised to be ${param.finalNullability} on exit, but is ${actual}.`,
                            this.fn.jp
                        );
                    }
                }
            }
            
            // Also check the Return Value contract
            if (fnSymbol.returnNullability) {
                const actualReturn = finalState.get("return");
                if (this.isWeaker(actualReturn, fnSymbol.returnNullability)) {
                     this.logError(
                        `Contract Violation: Return value was promised to be ${fnSymbol.returnNullability}, but is ${actualReturn}.`,
                        this.fn.jp
                    );
                }
            }
        }
    }

    private isWeaker(actual: Nullability | undefined, required: Nullability): boolean {
        // If no state is found, we assume the worst (MAYBE_NULL)
        const current = actual ?? Nullability.MAYBE_NULL;
        
        if (required === Nullability.NOT_NULL && current !== Nullability.NOT_NULL) {
            return true;
        }
        if (required === Nullability.NULL && current !== Nullability.NULL) {
            return true;
        }
        return false;
    }

    private logError(message: string, jp: any): void {
        const loc = jp.location ? ` at ${jp.location}` : "";
        console.error(`\x1b[31m[Nullability Error]\x1b[0m ${message}${loc}`);
    }
}