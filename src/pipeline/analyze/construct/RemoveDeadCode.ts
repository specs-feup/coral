import ConditionalEdge from "@specs-feup/clava-flow/cfg/edge/ConditionalEdge";
import ConditionNode from "@specs-feup/clava-flow/cfg/node/condition/ConditionNode";
import {
    BoolLiteral,
    FloatLiteral,
    IntLiteral,
} from "@specs-feup/clava/api/Joinpoints.js";
import CoralFunctionWiseTransformation, {
    CoralFunctionWiseTransformationApplier,
} from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";
import ControlFlowEndNode from "@specs-feup/flow/flow/ControlFlowEndNode";

export default class RemoveDeadCode extends CoralFunctionWiseTransformation {
    fnApplier = RemoveDeadCodeApplier;
}

class RemoveDeadCodeApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        const ids = this
            .fn
            .controlFlowNodes
            .filter(n => !n.is(ControlFlowEndNode))
            .toArray()
            .map((n) => n.id);
        const unreachableNodes = new Set<string>(ids);
        
        for (const node of this.fn.cfgEntryNode?.bfs(e => e.is(ControlFlowEdge)) ?? []) {
            unreachableNodes.delete(node.node.id);
        }
        
        for (const nodeId of unreachableNodes) {
            this.graph.getNodeById(nodeId)?.remove();
        }
    }
}
