import { FunctionJp, RecordJp } from "clava-js/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";
import MetaTy from "coral/mir/ty/meta/MetaTy";
import LifetimeBoundPragma from "coral/pragma/lifetime/LifetimeBoundPragma";
import MetaRegionVariable from "coral/regionck/MetaRegionVariable";
import MetaRegionVariableBound from "coral/regionck/MetaRegionVariableBound";

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

export default class StructDef {
    semantics: Ty.Semantics;
    dropFunction?: FunctionJp;
    $jp: RecordJp;
    isComplete: boolean;
    fields: Map<string, MetaTy>;
    metaRegionVars: MetaRegionVariable[];
    bounds: MetaRegionVariableBound[];

    constructor(
        $jp: RecordJp,
        isComplete: boolean,
        semantics: Ty.Semantics,
        fields: Map<string, MetaTy>,
        metaRegionVars: MetaRegionVariable[],
        bounds: MetaRegionVariableBound[],
        dropFunction?: FunctionJp,
    ) {
        this.$jp = $jp;
        this.fields = fields;
        this.semantics = semantics;
        this.isComplete = isComplete;
        this.metaRegionVars = metaRegionVars;
        this.bounds = bounds;
        this.dropFunction = dropFunction;
    }
}
