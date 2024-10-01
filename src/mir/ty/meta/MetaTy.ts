import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";
import RegionVariable from "coral/regionck/RegionVariable";


interface MetaTy {
    semantics: Ty.Semantics;
    isConst: boolean;
    toTy(regionVarMap: Map<string, RegionVariable>): Ty;
    get $jp(): Joinpoint;
}

export default MetaTy;
