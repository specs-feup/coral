import ConditionalEdge from "@specs-feup/clava-flow/cfg/edge/ConditionalEdge";
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ScopeNode from "@specs-feup/clava-flow/cfg/node/ScopeNode";
import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import {
    BoolLiteral,
    FloatLiteral,
    FunctionJp,
    IntLiteral,
    Joinpoint,
    Scope,
} from "@specs-feup/clava/api/Joinpoints.js";
import CoralFunctionWiseTransformation, {
    CoralFunctionWiseTransformationApplier,
} from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";
import ControlFlowNode from "@specs-feup/flow/flow/ControlFlowNode";

export default class RemoveImpossibleEdges extends CoralFunctionWiseTransformation {
    fnApplier = RemoveImpossibleEdgesApplier;
}

class RemoveImpossibleEdgesApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        const exit = this.fn.controlFlowNodes.filterIs(ControlFlowEndNode)[0];
        for (const node of this.fn.controlFlowNodes.filterIs(ConditionNode)) {
            const $condition = node.condition;
            if (
                $condition instanceof IntLiteral ||
                $condition instanceof FloatLiteral ||
                $condition instanceof BoolLiteral
            ) {
                if ($condition.value.valueOf() === 0) {
                    node.outgoers
                        .filterIs(ConditionalEdge)
                        .filter((e) => e.executesIfTrue)
                        .forEach((e) => e.remove());
                } else {
                    node.outgoers
                        .filterIs(ConditionalEdge)
                        .filter((e) => e.executesIfFalse)
                        .forEach((e) => e.remove());
                }
                this.#makeFakeUnwind(node, exit);
            }
        }
    }

    #makeFakeUnwind(node: ClavaControlFlowNode.Class, exit: ControlFlowEndNode.Class): void {
        let currentNode: ClavaControlFlowNode.Class = node;
        let currentJp: Joinpoint = node.jp;

        while (!(currentJp instanceof FunctionJp)) {
            if (currentJp instanceof Scope) {
                const endScope = this.graph
                    .addNode()
                    .init(new ControlFlowNode.Builder(this.fn))
                    .init(new ScopeNode.Builder(
                        currentJp,
                        ScopeNode.Direction.EXITING,
                        ScopeNode.ControlFlowKind.JUMP,
                    ))
                    .as(ScopeNode);
                
                this.graph
                    .addEdge(currentNode, endScope)
                    .init(new ControlFlowEdge.Builder().fake())
                    .as(ControlFlowEdge);
                currentNode = endScope;
            }

            currentJp = currentJp.parent;
        }

        this.graph
            .addEdge(currentNode, exit)
            .init(new ControlFlowEdge.Builder().fake())
            .as(ControlFlowEdge);
    }
}
