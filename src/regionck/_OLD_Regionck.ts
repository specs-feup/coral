import Ty from "@specs-feup/coral/mir/ty/Ty";
import RegionConstraint from "@specs-feup/coral/regionck/OutlivesConstraint";
import Region from "@specs-feup/coral/regionck/RegionVariable";
import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";
import InferLifetimeBounds from "@specs-feup/coral/pass/InferLifetimeBounds";

export default class Regionck {
    // List of meta region variable constraints that can be set via pragmas by the user.
    // Prolly use MetaRegionBound instead 
    bounds: LifetimeBoundPragma[];

    get universalRegionVars(): Region[] {
        return this.#regionVars.filter((r) => r.kind === Region.Kind.UNIVERSAL);
    }

    reset(): void {
        this.constraints = [];
        for (const region of this.#regionVars) {
            region.points.clear();
            region.kind = region.actualKind;
        }
    }
}
