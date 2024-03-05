import RegionVariable from "./RegionVariable.js";
import DfsVisitor from "../graph/DfsVisitor.js";
import Regionck from "./Regionck.js";
import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";

/**
 * A constraint that lifetime 'sup' outlives lifetime 'sub' at point 'point'.
 */
export default class OutlivesConstraint {
    sup: RegionVariable;
    sub: RegionVariable;
    point: string;

    constructor(sup: RegionVariable, sub: RegionVariable, point: string) {
        this.sup = sup;
        this.sub = sub;
        this.point = point;
    }

    toString(): string {
        return `${this.sup.name} : ${this.sub.name} @ ${this.point}`;
    }

    /**
     * @param {Regionck} regionck
     * @returns {boolean} True if changed
     */
    apply(regionck: Regionck): boolean {
        return DfsVisitor.visit(
            regionck.cfg.graph.$(`#${this.point}`),
            (node: cytoscape.NodeSingular) => {
                const alreadyContains = this.sup.points.has(node.id());
                if (alreadyContains) {
                    return false;
                }
                this.sup.points.add(node.id());
                return true;
            },
            (node: cytoscape.NodeSingular) => this.sub.points.has(node.id()),
        );
    }
}
