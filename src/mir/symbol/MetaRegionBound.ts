import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";

/**
 * A meta-constraint that lifetime 'sup' outlives lifetime 'sub'.
 */
export default class MetaRegionBound {
    #sup: string;
    #sub: string;

    constructor(sup: string, sub: string) {
        this.#sup = sup;
        this.#sub = sub;
    }

    static fromPragma(pragma: LifetimeBoundPragma) {
        return new MetaRegionBound(pragma.name, pragma.bound!);
    }

    get sup(): string {
        return this.#sup;
    }

    get sub(): string {
        return this.#sub;
    }
}
