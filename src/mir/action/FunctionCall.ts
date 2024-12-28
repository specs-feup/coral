import { Call } from "@specs-feup/clava/api/Joinpoints.js";
import Fn from "@specs-feup/coral/mir/symbol/Fn";
import Region from "@specs-feup/coral/mir/symbol/Region";
import RegionBound from "@specs-feup/coral/mir/symbol/region/RegionBound";
import Ty from "@specs-feup/coral/mir/symbol/Ty";

export default class FunctionCall {
    #jp: Call;
    #fn: Fn;
    #regions: Map<string, Region>;
    #returnTy: Ty;
    #paramTys: Ty[];

    constructor(
        $jp: Call,
        fn: Fn,
        regions: Map<string, Region>,
        returnTy: Ty,
        paramTys: Ty[],
    ) {
        this.#jp = $jp;
        this.#fn = fn;
        this.#regions = regions;
        this.#returnTy = returnTy;
        this.#paramTys = paramTys;
    }

    get jp(): Call {
        return this.#jp;
    }

    get returnTy(): Ty {
        return this.#returnTy;
    }

    get paramTys(): Ty[] {
        return this.#paramTys;
    }

    get bounds(): RegionBound[] {
        return this.#fn.bounds.map((b) => b.toRegionBound(this.#regions));
    }
}
