import RegionVariable from "./RegionVariable.js";
import Regionck from "./Regionck.js";
import DfsVisitor from "../graph/DfsVisitor.js";


/**
 * A constraint that lifetime 'sup' outlives lifetime 'sub' at point 'point'.
 */
export default class OutlivesConstraint {
    /**
     * @type {RegionVariable}
     */
    sup;
    /**
     * @type {RegionVariable}
     */
    sub;
    /**
     * @type {string}
     */
    point;

    constructor(sup, sub, point) {
        this.sup = sup;
        this.sub = sub;
        this.point = point;
    }

    /**
     * @returns {string}
     */
    toString() {
        return `${this.sup.name} : ${this.sub.name} @ ${this.point}`;
    }

    /**
     * @param {Regionck} regionck
     * @returns {boolean} True if changed
     */
    apply(regionck) {
        return DfsVisitor.visit(regionck.cfg.graph.$(`#${this.point}`), 
            (node) => {
                const alreadyContains = this.sup.points.has(node.id());
                if (alreadyContains) {
                    return false;
                }
                this.sup.points.add(node.id());
                return true;
            },
            (node) => this.sub.points.has(node.id()));
    }
}
