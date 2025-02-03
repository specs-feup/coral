import { Pragma } from "@specs-feup/clava/api/Joinpoints.js";
import Region from "@specs-feup/coral/mir/symbol/Region";
import MetaRegion from "@specs-feup/coral/mir/symbol/region/meta/MetaRegion";
import RegionBound from "@specs-feup/coral/mir/symbol/region/RegionBound";
import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";

/**
 * A meta-constraint that lifetime 'sup' outlives lifetime 'sub'.
 */
export default class MetaRegionBound {
    #sup: MetaRegion;
    #sub: MetaRegion;

    constructor(sup: MetaRegion, sub: MetaRegion) {
        this.#sup = sup;
        this.#sub = sub;
    }

    static fromPragma(pragma: LifetimeBoundPragma) {
        return new MetaRegionBound(
            new MetaRegion(pragma.name),
            new MetaRegion(pragma.bound!),
        );
    }

    get sup(): MetaRegion {
        return this.#sup;
    }

    get sub(): MetaRegion {
        return this.#sub;
    }

    toRegionBound(regionMap: Map<string, Region>): RegionBound {
        return new RegionBound(
            this.#sup.toRegion(regionMap),
            this.#sub.toRegion(regionMap),
        );
    }
    
    toPragma(): Pragma {
        return new Pragma(`#pragma coral lf ${this.#sup}: ${this.#sub}`);
    }
}
