import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";

abstract class Ty {
    abstract get name(): string;
    abstract get regionVars(): RegionVariable[];
    abstract get semantics(): Ty.Semantics;
    abstract get isConst(): boolean;
    abstract get $jp(): Joinpoint;

    abstract equals(other: Ty): boolean;
    abstract toString(): string;

    get nestedRegionVars(): RegionVariable[] {
        return this.regionVars;
    }

    get requiresLifetimes(): boolean {
        return this.regionVars.length > 0;
    }
}

namespace Ty {
    export enum Semantics {
        COPY = "copy",
        MOVE = "move",
    }
}

export default Ty;
