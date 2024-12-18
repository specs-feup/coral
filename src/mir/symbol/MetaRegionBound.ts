import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";

/**
 * A meta-constraint that lifetime 'sup' outlives lifetime 'sub'.
 */
export default class MetaRegionBound {
    #pragma: LifetimeBoundPragma;

    constructor(pragma: LifetimeBoundPragma) {
        this.#pragma = pragma;
    }

    get sup(): string {
        return this.#pragma.name;
    }

    get sub(): string {
        return this.#pragma.bound!;
    }
}
