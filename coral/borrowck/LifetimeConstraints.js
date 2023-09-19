laraImport("coral.borrowck.OutlivesConstraint");
laraImport("coral.errors.CoralError");

class LifetimeConstraints {

    #liveSet;
    #outlivesConstraints;

    constructor() {
        this.#liveSet = new Set();
        this.#outlivesConstraints = [];
    }

    addPoint(lifetime, point) {
        let L = this.#liveSet.get(lifetime);
        if (L === undefined) {
            L = new Set([point]);
            this.#liveSet.set(lifetime, L);
        } else {
            L.add(point);
        }
    }

    addConstraint(c) {
        if (c instanceof OutlivesConstraint) {
            this.#outlivesConstraints.push(c);
        } else {
            throw new CoralError("Unsupported constraint type: " + c);
        }
    }

}
