import LivenessNode from "clava-flow/flow/transformation/liveness/LivenessNode";
import DropNode from "coral/graph/DropNode";

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
