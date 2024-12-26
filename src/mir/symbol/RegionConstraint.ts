import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import Region from "@specs-feup/coral/mir/symbol/Region";

/**
 * A constraint that lifetime 'sup' outlives lifetime 'sub' at node 'node'.
 */
export default class RegionConstraint {
    #sup: Region;
    #sub: Region;
    #node: CoralCfgNode.Class;
    // "end()" points added to the sup region variable due to this constraint.
    // This is relevant for producing error messages for universal region variables.
    #addedEnds: Set<string>;
    #jp: Joinpoint;

    constructor(sup: Region, sub: Region, node: CoralCfgNode.Class, jp: Joinpoint) {
        this.#sup = sup;
        this.#sub = sub;
        this.#node = node;
        this.#addedEnds = new Set();
        this.#jp = jp;
    }

    toString(): string {
        // TODO instead of ID, use something more recognizable, like line/location
        return `${this.#sup.name}: ${this.#sub.name} @ ${this.#node.id}`;
    }

    apply(): boolean {
        return this.#sub.constrain(this.#sup, this.#node);
    }
}

export enum Variance {
    CO = "covariant",
    CONTRA = "contravariant",
    IN = "invariant",
}

export namespace Variance {
    export function invert(variance: Variance): Variance {
        switch (variance) {
            case Variance.CO:
                return Variance.CONTRA;
            case Variance.CONTRA:
                return Variance.CO;
            case Variance.IN:
                return Variance.IN;
        }
    }

    export function xform(lhs: Variance, rhs: Variance) {
        switch (lhs) {
            case Variance.CO:
                return rhs;
            case Variance.CONTRA:
                return Variance.invert(rhs);
            case Variance.IN:
                return Variance.IN;
        }
    }
}
