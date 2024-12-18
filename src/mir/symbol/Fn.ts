import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/MetaRegionBound";
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";

export default class Fn {
    #jp: FunctionJp;
    #bounds: MetaRegionBound[];
    #metaRegions: MetaRegion[];
    #return: MetaTy;
    #params: MetaTy[];

    constructor(
        $jp: FunctionJp,
        bounds: MetaRegionBound[],
        metaRegions: MetaRegion[],
        $return: MetaTy,
        params: MetaTy[],
    ) {
        this.#jp = $jp;
        this.#bounds = bounds;
        this.#metaRegions = metaRegions;
        this.#return = $return;
        this.#params = params;
    }

    get jp(): FunctionJp {
        return this.#jp;
    }

    get bounds(): MetaRegionBound[] {
        return this.#bounds;
    }

    get metaRegions(): MetaRegion[] {
        return this.#metaRegions;
    }

    get return(): MetaTy {
        return this.#return;
    }

    get params(): MetaTy[] {
        return this.#params;
    }
}
