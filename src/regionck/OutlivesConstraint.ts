import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import CoralNode from "coral/graph/CoralNode";
import RegionVariable from "coral/regionck/RegionVariable";


/**
 * A constraint that lifetime 'sup' outlives lifetime 'sub' at node 'node'.
 */
export default class OutlivesConstraint {
    sup: RegionVariable;
    sub: RegionVariable;
    node: CoralNode.Class;

    constructor(sup: RegionVariable, sub: RegionVariable, node: CoralNode.Class) {
        this.sup = sup;
        this.sub = sub;
        this.node = node;
    }

    toString(): string {
        return `${this.sup.name}: ${this.sub.name} @ ${this.node.id}`;
    }

    apply(): boolean {
        let changed = false;

        const nodes = this.node.bfs(
            (edge) => edge.is(ControlFlowEdge.TypeGuard)
                && this.sub.points.has(edge.target.id)
        );

        for (const [node] of nodes) {
            const alreadyContains = this.sup.points.has(node.id);
            if (alreadyContains) {
                continue;
            }
            this.sup.points.add(node.id);
            changed = true;
        }

        return changed;
    }
}
