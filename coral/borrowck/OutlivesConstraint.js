/**
 * A constraint that the lifetime of `sup` outlives the lifetime of `sub` at point `point`.
 */
class OutlivesConstraint {
    sup;
    sub;
    point;

    constructor(sup, sub, point) {
        this.sup = sup;
        this.sub = sub;
        this.point = point;
    }
}
