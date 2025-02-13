import { FunctionJp, Param } from "@specs-feup/clava/api/Joinpoints.js";
import MetaRegion from "@specs-feup/coral/mir/symbol/region/meta/MetaRegion";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/region/meta/MetaRegionBound";
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";

export class FnParam {
    #jp: Param;
    #ty: MetaTy;

    constructor($jp: Param, ty: MetaTy) {
        this.#jp = $jp;
        this.#ty = ty;
    }

    get jp(): Param {
        return this.#jp;
    }

    get ty(): MetaTy {
        return this.#ty;
    }
}

export default class Fn {
    #jp: FunctionJp;
    #baseBounds: MetaRegionBound[];
    #addedBounds: MetaRegionBound[];
    #baseMetaRegions: MetaRegion[];
    #addedMetaRegions: MetaRegion[];
    #return: MetaTy;
    #params: FnParam[];
    #hasLifetimePragmas: boolean;

    constructor(
        $jp: FunctionJp,
        bounds: MetaRegionBound[],
        baseMetaRegions: MetaRegion[],
        addedMetaRegions: MetaRegion[],
        $return: MetaTy,
        params: FnParam[],
        hasLifetimePragmas: boolean,
    ) {
        this.#jp = $jp;
        this.#baseBounds = bounds;
        this.#addedBounds = [];
        this.#baseMetaRegions = baseMetaRegions;
        this.#addedMetaRegions = addedMetaRegions;
        this.#return = $return;
        this.#params = params;
        this.#hasLifetimePragmas = hasLifetimePragmas;
    }

    get jp(): FunctionJp {
        return this.#jp;
    }

    get bounds(): MetaRegionBound[] {
        return [...this.#baseBounds, ...this.#addedBounds];
    }

    get addedBounds(): MetaRegionBound[] {
        return this.#addedBounds;
    }

    addBound(bound: MetaRegionBound): void {
        this.#addedBounds.push(bound);
    }

    get metaRegions(): MetaRegion[] {
        return [...this.#baseMetaRegions, ...this.#addedMetaRegions];
    }
    
    get baseMetaRegions(): MetaRegion[] {
        return this.#baseMetaRegions;
    }

    get addedMetaRegions(): MetaRegion[] {
        return this.#addedMetaRegions;
    }

    get return(): MetaTy {
        return this.#return;
    }

    get params(): FnParam[] {
        return this.#params;
    }

    get hasLifetimePragmas(): boolean {
        return this.#hasLifetimePragmas;
    }
}
