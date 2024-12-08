import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/ty/Ty";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";

interface MetaTy {
    semantics: Ty.Semantics;
    isConst: boolean;
    toTy(regionVarMap: Map<string, RegionVariable>): Ty;
    get $jp(): Joinpoint;
}

export default MetaTy;
