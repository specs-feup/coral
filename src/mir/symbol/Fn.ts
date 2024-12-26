import { FunctionJp, Param } from "@specs-feup/clava/api/Joinpoints.js";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/MetaRegionBound";
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
    // TODO should probably be Set
    #metaRegions: MetaRegion[];
    #return: MetaTy;
    #params: FnParam[];
    #hasLifetimePragmas: boolean;

    constructor(
        $jp: FunctionJp,
        bounds: MetaRegionBound[],
        metaRegions: MetaRegion[],
        $return: MetaTy,
        params: FnParam[],
        hasLifetimePragmas: boolean,
    ) {
        this.#jp = $jp;
        this.#baseBounds = bounds;
        this.#addedBounds = [];
        this.#metaRegions = metaRegions;
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

    addBound(bound: MetaRegionBound): void {
        this.#addedBounds.push(bound);
    }

    get metaRegions(): MetaRegion[] {
        return this.#metaRegions;
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
