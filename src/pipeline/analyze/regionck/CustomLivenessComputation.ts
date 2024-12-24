import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import ReturnNode from "@specs-feup/clava-flow/cfg/node/ReturnNode";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import { BinaryOp, Expression, Varref } from "@specs-feup/clava/api/Joinpoints.js";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import CoralFunctionWiseTransformation, { CoralFunctionWiseTransformationApplier } from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import DropNode from "@specs-feup/coral/graph/DropNode";
import Graph from "@specs-feup/flow/graph/Graph";
import Node from "@specs-feup/flow/graph/Node";
import Query from "@specs-feup/lara/api/weaver/Query.js";

export default class CustomLivenessComputation
    implements Graph.Transformation<CoralGraph.Class, CoralGraph.Class>
{
    static computeDefsAndUses(node: CoralCfgNode.Class) {
        if (node.is(DropNode)) {
            const dropNode = node.as(DropNode);
            for (const access of dropNode.accesses) {
                node.addUse(access.path.vardecl);
            }
        }
    }

    apply(graph: CoralGraph.Class): CoralGraph.Class {
        return graph.apply(
            new InferLiveness({
                customComputeDefsAndUses: CustomLivenessComputation.computeDefsAndUses,
            }),
        );
    }
}

interface InferLivenessArgs {
    customComputeDefsAndUses?: (node: CoralCfgNode.Class) => void;
}

class InferLiveness extends CoralFunctionWiseTransformation<InferLivenessArgs> {
    fnApplier = InferLivenessApplier;
}

class InferLivenessApplier extends CoralFunctionWiseTransformationApplier<InferLivenessArgs> {
    apply(): void {
        this.#computeDefsAndUses();
        this.#computeLiveInOut();
    }

    #computeDefsAndUses() {
        for (const node of this.fn.controlFlowNodes.expectAll(CoralCfgNode, "Nodes were previously inited as CoralCfgNode")) {
            node.switch(
                Node.Case(VariableDeclarationNode, n => {
                    if (n.jp.hasInit) {
                        node.addDef(n.jp);
                        this.#computeDefAndUse(node, n.jp.init!);
                    }
                }),
                Node.Case(ExpressionNode, n => this.#computeDefAndUse(node, n.jp)),
                Node.Case(ReturnNode, n => this.#computeDefAndUse(node, n.jp.returnExpr)),
                Node.Case(ConditionNode, n => this.#computeDefAndUse(node, n.condition)),
            );

            if (this.args.customComputeDefsAndUses !== undefined) {
                this.args.customComputeDefsAndUses(node);
            }
        }
    }

    #computeDefAndUse(node: CoralCfgNode.Class, $jp: Expression) {
        const assignedVars = new Set<string>();

        const $assignments = Query.searchFromInclusive($jp, BinaryOp, {
            isAssignment: true,
            left: (left) => left instanceof Varref,
        });
        for (const $assignment of $assignments) {
            const $vardecl = $assignment.left.vardecl;

            if ($vardecl === undefined || $vardecl.isGlobal) {
                continue;
            }

            assignedVars.add($assignment.left.astId);

            node.addDef($vardecl);
        }

        const $varRefs = Query.searchFromInclusive($jp, Varref);
        for (const $varRef of $varRefs) {
            if ($varRef.vardecl === undefined || $varRef.vardecl.isGlobal) {
                continue;
            }

            if (assignedVars.has($varRef.astId)) {
                continue;
            }

            node.addUse($varRef.vardecl);
        }
    }

    #computeLiveInOut() {
        let liveChanged;
        do {
            liveChanged = false;
            for (const node of this.fn.controlFlowNodes.expectAll(CoralCfgNode, "Nodes were previously inited as CoralCfgNode")) {
                const oldLiveIn = new Set(node.liveIn.map((v) => v.astId));
                const oldLiveOut = new Set(node.liveOut.map((v) => v.astId));

                node.updateLiveIn();
                node.updateLiveOut();

                const newLiveIn = new Set(node.liveIn.map((v) => v.astId));
                const newLiveOut = new Set(node.liveOut.map((v) => v.astId));

                if (
                    oldLiveIn.size !== newLiveIn.size ||
                    oldLiveOut.size !== newLiveOut.size ||
                    ![...oldLiveIn].every((e) => newLiveIn.has(e)) ||
                    ![...oldLiveOut].every((e) => newLiveOut.has(e))
                ) {
                    liveChanged = true;
                }
            }
        } while (liveChanged);
    }
}
