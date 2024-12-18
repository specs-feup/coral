import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import Region from "@specs-feup/coral/regionck/Region";

interface MetaTy {
    get semantics(): Ty.Semantics;
    get isConst(): boolean;
    get jp(): Joinpoint;

    toTy(regionVarMap: Map<string, Region>): Ty;
}

export default MetaTy;
