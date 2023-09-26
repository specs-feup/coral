laraImport("coral.borrowck.RegionVariable");
laraImport("coral.borrowck.Regionck");
laraImport("coral.graph.DfsVisitor");


/**
 * A constraint that lifetime 'sup' outlives lifetime 'sub' at point 'point'.
 */
class OutlivesConstraint {
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
        const root = regionck.cfg.graph.$(`#${this.point}`);
        let changed = false; 

        DfsVisitor.visit(root, 
            (node) => this.sup.points.add(node.id()),
            (node) => this.sub.points.has(node.id()));

        return changed;
    }
}
