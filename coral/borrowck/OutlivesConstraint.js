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
        if (this.sup === undefined) {
            println("Sup is undefined");
        }
        if (this.sub === undefined) {
            println("Sub is undefined");
        }
        if (this.sup === undefined || this.sub === undefined) {
            println(this.point);
        }
        return `${this.sup.name} : ${this.sub.name} @ ${this.point}`;
    }
}
