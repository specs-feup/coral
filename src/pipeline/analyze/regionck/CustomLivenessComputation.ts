

export default class CustomLivenessComputation {
    static computeDefsAndUses(node: LivenessNode.Class) {
        if (node.is(DropNode.TypeGuard)) {
            const dropNode = node.as(DropNode.Class);
            for (const access of dropNode.accesses) {
                node.addUse(access.path.innerVardecl);
            }
        }
    }
}

class InferLiveness implements GraphTransformation {
    #customComputeDefsAndUses?: (node: LivenessNode.Class) => void;

    customComputeDefsAndUses(
        callback: (node: LivenessNode.Class) => void,
    ): InferLiveness {
        this.#customComputeDefsAndUses = callback;
        return this;
    }

    apply(graph: BaseGraph.Class): void {
        for (const node of graph.nodes) {
            if (node.is(FlowNode.TypeGuard)) {
                node.init(new LivenessNode.Builder());
            }
        }

        this.#computeDefsAndUses(graph);
        this.#computeLiveInOut(graph);
    }

    #computeDefsAndUses(graph: BaseGraph.Class) {
        for (const node of graph.nodes) {
            if (!node.is(LivenessNode.TypeGuard)) {
                continue;
            }

            const nodeAsLiveness = node.as(LivenessNode.Class);

            if (node.is(ConditionNode.TypeGuard)) {
                const conditionNode = node.as(ConditionNode.Class);
                const $jp = conditionNode.jp;
                if ($jp instanceof If) {
                    this.#computeDefAndUse(nodeAsLiveness, $jp.cond);
                } else if ($jp instanceof Loop) {
                    this.#computeDefAndUse(nodeAsLiveness, $jp.cond);
                }
            } else if (node.is(VarDeclarationNode.TypeGuard)) {
                const varDeclarationNode = node.as(VarDeclarationNode.Class);
                const $varDecl = varDeclarationNode.jp;
                if (varDeclarationNode.jp.hasInit) {
                    nodeAsLiveness.addDef($varDecl);
                }
                this.#computeDefAndUse(nodeAsLiveness, $varDecl.init);
            } else if (node.is(ExpressionNode.TypeGuard)) {
                const expressionNode = node.as(ExpressionNode.Class);
                this.#computeDefAndUse(nodeAsLiveness, expressionNode.jp);
            } else if (node.is(SwitchNode.TypeGuard)) {
                const switchNode = node.as(SwitchNode.Class);
                this.#computeDefAndUse(nodeAsLiveness, switchNode.jp.condition);
            } else if (node.is(ReturnNode.TypeGuard)) {
                const returnNode = node.as(ReturnNode.Class);
                this.#computeDefAndUse(nodeAsLiveness, returnNode.jp.returnExpr);
            }

            if (this.#customComputeDefsAndUses !== undefined) {
                this.#customComputeDefsAndUses(nodeAsLiveness);
            }
        }
    }

    #computeDefAndUse(node: LivenessNode.Class, $jp: Statement | Expression | undefined) {
        if ($jp === undefined) {
            return;
        }

        const assignedVars = new Set<string>();

        const $assignments = Query.searchFromInclusive($jp, BinaryOp, {
            isAssignment: true,
            left: (left: LaraJoinPoint) => left instanceof Varref,
        });
        for (const $jp of $assignments) {
            const $assignment = $jp as BinaryOp;
            const $vardecl = ($assignment.left as Varref).vardecl;

            if ($vardecl === undefined || $vardecl.isGlobal) {
                continue;
            }

            assignedVars.add($assignment.left.astId);

            node.addDef($vardecl);
        }

        const $varRefs = Query.searchFromInclusive($jp, "varref");
        for (const $jp of $varRefs) {
            const $varRef = $jp as Varref;

            if ($varRef.vardecl === undefined || $varRef.vardecl.isGlobal) {
                continue;
            }

            if (assignedVars.has($varRef.astId)) {
                continue;
            }

            node.addUse($varRef.vardecl);
        }
    }

    #computeLiveInOut(graph: BaseGraph.Class) {
        let liveChanged;
        do {
            liveChanged = false;
            for (const node of graph.nodes) {
                if (!node.is(LivenessNode.TypeGuard)) {
                    continue;
                }

                const nodeAsLiveness = node.as(LivenessNode.Class);
                const oldLiveIn = new Set(nodeAsLiveness.liveIn.map((v) => v.astId));
                const oldLiveOut = new Set(nodeAsLiveness.liveOut.map((v) => v.astId));

                nodeAsLiveness.updateLiveIn();
                nodeAsLiveness.updateLiveOut();

                const newLiveIn = new Set(nodeAsLiveness.liveIn.map((v) => v.astId));
                const newLiveOut = new Set(nodeAsLiveness.liveOut.map((v) => v.astId));

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
