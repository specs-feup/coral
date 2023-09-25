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
}
