import { FunctionJp, RecordJp } from "clava-js/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";

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

class StructDef {
    semantics: Ty.Semantics;
    dropFunction?: FunctionJp;
    $jp: RecordJp;
    isComplete: boolean;
    metaRegionVars: MetaRegionVar[];

    // mapear cada nome de regionVar para a sua respectiva MetaRegionVar

    metaRegionVars: MetaRegionVar[];
    fields: Map<name, MetaTy>;
}
