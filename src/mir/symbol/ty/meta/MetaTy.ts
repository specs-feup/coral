import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";

interface MetaTy {
    get semantics(): Ty.Semantics;
    get isConst(): boolean;
    get jp(): Joinpoint;

    toTy(regionVarMap: Map<string, RegionVariable>): Ty;
}

export default MetaTy;
