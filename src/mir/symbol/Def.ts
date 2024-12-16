import { FunctionJp, RecordJp } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";
import MetaRegionVariable from "@specs-feup/coral/regionck/MetaRegionVariable";
import MetaRegionVariableBound from "@specs-feup/coral/regionck/MetaRegionVariableBound";

/**
 * #pragma coral lf %a
 * struct A {
 *   int x;
 *   int y;
 *   #pragma coral lf inner = %a
 *   #pragma coral lf inner->%a = %a
 *   A *inner;
 * }
 *
 */

export default class Def {
    #jp: RecordJp;
    #isComplete: boolean;
    #semantics: Ty.Semantics;
    #fields: Map<string, MetaTy>;
    #metaRegionVars: MetaRegionVariable[];
    #bounds: MetaRegionVariableBound[];
    #dropFunction?: FunctionJp;

    constructor(
        $jp: RecordJp,
        isComplete: boolean,
        semantics: Ty.Semantics,
        fields: Map<string, MetaTy>,
        metaRegionVars: MetaRegionVariable[],
        bounds: MetaRegionVariableBound[],
        dropFunction?: FunctionJp,
    ) {
        this.#jp = $jp;
        this.#fields = fields;
        this.#semantics = semantics;
        this.#isComplete = isComplete;
        this.#metaRegionVars = metaRegionVars;
        this.#bounds = bounds;
        this.#dropFunction = dropFunction;
    }

    get $jp(): RecordJp {
        return this.#jp;
    }

    get isComplete(): boolean {
        return this.#isComplete;
    }

    get semantics(): Ty.Semantics {
        return this.#semantics;
    }
    
    get fields(): Map<string, MetaTy> {
        return this.#fields;
    }

    get metaRegionVars(): MetaRegionVariable[] {
        return this.#metaRegionVars;
    }

    get bounds(): MetaRegionVariableBound[] {
        return this.#bounds;
    }

    get dropFunction(): FunctionJp | undefined {
        return this.#dropFunction;
    }
}
