import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import Region from "@specs-feup/coral/mir/symbol/Region";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";

export default class ExistentialRegion extends Region {
    override constrain(region: Region, node: CoralCfgNode.Class): boolean {
        const nodes: CoralCfgNode.Class[] = [];
        if (this.has(node)) {
            const search = node.bfs((edge) => edge.is(ControlFlowEdge) && this.has(edge.target.expect(CoralCfgNode)));
            
            for (const { node: n } of search) {
                nodes.push(n.expect(CoralCfgNode));
            }
        }

        return nodes.some(node => !region.add(node));
    }
}
