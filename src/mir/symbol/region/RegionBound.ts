import Region from "@specs-feup/coral/mir/symbol/Region";

/**
 * A meta-constraint that lifetime 'sup' outlives lifetime 'sub'.
 */
export default class RegionBound {
    #sup: Region;
    #sub: Region;

    constructor(sup: Region, sub: Region) {
        this.#sup = sup;
        this.#sub = sub;
    }

    get sup(): Region {
        return this.#sup;
    }

    get sub(): Region {
        return this.#sub;
    }
}
