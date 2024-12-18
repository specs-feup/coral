import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import Region from "@specs-feup/coral/regionck/RegionVariable";

interface Ty {
    get regionVars(): Region[];
    get semantics(): Ty.Semantics;
    get isConst(): boolean;
    get jp(): Joinpoint;

    toString(): string;
}

namespace Ty {
    export enum Semantics {
        COPY = "copy",
        MOVE = "move",
    }
}

export default Ty;
