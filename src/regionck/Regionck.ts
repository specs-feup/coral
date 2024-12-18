import Ty from "@specs-feup/coral/mir/ty/Ty";
import RegionConstraint from "@specs-feup/coral/regionck/OutlivesConstraint";
import Region from "@specs-feup/coral/regionck/RegionVariable";
import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";
import InferLifetimeBounds from "@specs-feup/coral/pass/InferLifetimeBounds";

export default class Regionck {
    // List of constraints that must be satisfied based on the regionck analysis.
    constraints: RegionConstraint[];
    // List of meta region variable constraints that can be set via pragmas by the user.
    bounds: LifetimeBoundPragma[];
    #regionVars: Region[];
    #returnTy?: Ty;

    // Should go to FunctionNode
    inferLifetimeBoundsState: InferLifetimeBounds.FunctionState;

    constructor() {
        this.constraints = [];
        this.bounds = [];
        this.#regionVars = [];
        this.inferLifetimeBoundsState = InferLifetimeBounds.FunctionState.IGNORE;
    }

    registerReturnTy(ty: Ty): void {
        this.#returnTy = ty;
    }

    getReturnTy(): Ty | undefined {
        return this.#returnTy;
    }

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

    debugInfo(): string {
        let result = "\t| Regions:\n";
        for (const region of this.#regionVars) {
            const points = Array.from(region.points).sort();
            result += `\t|\t${region.name}: {${points.join(", ")}}\n`;
        }

        result += "\t|\n\t| Constraints:\n";
        for (const constraint of this.constraints) {
            result += `\t|\t${constraint.toString()}\n`;
        }

        return result + "\n";
    }
}
