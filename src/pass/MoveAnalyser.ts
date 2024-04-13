import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import BaseGraph from "clava-flow/graph/BaseGraph";
import { GraphTransformation } from "clava-flow/graph/Graph";
import CoralGraph from "coral/graph/CoralGraph";
import CoralNode from "coral/graph/CoralNode";
import MoveTable from "coral/mir/MoveTable";

export default class MoveAnalyser implements GraphTransformation {
    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("MoveAnalyser can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        for (const functionEntry of coralGraph.functions) {
            this.#processFunction(functionEntry);
        }
    }

    #processFunction(functionEntry: FunctionEntryNode.Class) {
        let changed = true;
        while (changed) {
            changed = false;
            for (const [node, path] of functionEntry.bfs((e) =>
                e.is(ControlFlowEdge.TypeGuard),
            )) {
                if (!node.is(CoralNode.TypeGuard)) {
                    continue;
                }

                const coralNode = node.as(CoralNode.Class);

                const previousMoveTable = coralNode.moveTable;

                if (path.length === 0) {
                    coralNode.moveTable.enterParams(functionEntry.jp.params);
                } else {
                    coralNode.moveTable = MoveTable.merge(
                        node.incomers
                            .filter((e) => e.is(ControlFlowEdge.TypeGuard))
                            .map((e) => e.source)
                            .map((n) => {
                                if (!n.is(CoralNode.TypeGuard)) {
                                    throw new Error("Expected node to be a CoralNode.");
                                }
                                return n.as(CoralNode.Class).moveTable;
                            }),
                    );
                }

                coralNode.moveTable.enterScope(coralNode.varsEnteringScope);

                for (const access of coralNode.accesses) {
                    coralNode.moveTable.updateAccess(access);
                }

                if (!coralNode.moveTable.equals(previousMoveTable)) {
                    changed = true;
                }
            }
        }
    }
}
