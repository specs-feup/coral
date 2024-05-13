import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import { Joinpoint } from "clava-js/api/Joinpoints.js";
import CoralNode from "coral/graph/CoralNode";
import RegionVariable from "coral/regionck/RegionVariable";


/**
 * A constraint that lifetime 'sup' outlives lifetime 'sub' at node 'node'.
 */
export default class OutlivesConstraint {
    sup: RegionVariable;
    sub: RegionVariable;
    node: CoralNode.Class;
    // "end()" points added to the sup region variable due to this constraint.
    // This is relevant for producing error messages for universal region variables.
    addedEnds: Set<string>;
    $jp: Joinpoint;

    constructor(
        sup: RegionVariable,
        sub: RegionVariable,
        node: CoralNode.Class,
        $jp: Joinpoint,
    ) {
        this.sup = sup;
        this.sub = sub;
        this.node = node;
        this.addedEnds = new Set();
        this.$jp = $jp;
    }

    toString(): string {
        return `[${this.node.id}] ${this.sup.name}: ${this.sub.name}`;
    }

    apply(): boolean {
        if (this.sub.kind === RegionVariable.Kind.EXISTENTIAL) {
            return this.applyExistential();
        } else {
            return this.applyUniversal();
        }
    }

    applyUniversal(): boolean {
        let changed = false;
        if (this.sup.kind !== RegionVariable.Kind.UNIVERSAL) {
            changed = true;
            this.sup.kind = RegionVariable.Kind.UNIVERSAL;
        }

        for (const point of this.sub.points) {
            if (this.sup.points.has(point)) {
                continue;
            }
            this.sup.points.add(point);
            this.addedEnds.add(point);
            changed = true;
        }

        return changed;
    }

    applyExistential(): boolean {
        let changed = false;

        let nodes;
        if (this.sub.points.has(this.node.id)) {
            nodes = this.node.bfs(
                (edge) =>
                    edge.is(ControlFlowEdge.TypeGuard) &&
                    this.sub.points.has(edge.target.id),
            );
        } else {
            nodes = [];
        }

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
