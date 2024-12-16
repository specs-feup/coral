import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";

interface Ty {
    get regionVars(): RegionVariable[];
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
