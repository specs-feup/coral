import MissingLifetimeBoundError from "@specs-feup/coral/error/borrow/MissingLifetimeBoundError";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralTransformation, { CoralTransformationApplier } from "@specs-feup/coral/graph/CoralTransformation";


interface UniversalRegionsErrorReportingArgs {
    target: CoralFunctionNode.Class;
}

export default class UniversalRegionsErrorReporting extends CoralTransformation<UniversalRegionsErrorReportingArgs> {
    applier = UniversalRegionsErrorReportingApplier;
}

class UniversalRegionsErrorReportingApplier extends CoralTransformationApplier<UniversalRegionsErrorReportingArgs> {
    apply(): void {
        for (const region of this.args.target.universalRegions) {
            for (const bound of region.missingBounds(this.args.target.bounds)) {
                const relevantConstraint = this.args.target.regionConstraints.find(
                    (c) => c.sup.name === bound.sup && c.addedEnds.has(bound.sub),
                );
                if (!relevantConstraint) {
                    throw new Error("No relevant constraint found");
                }
                throw new MissingLifetimeBoundError(
                    bound,
                    relevantConstraint,
                    this.args.target.jp,
                );
            }
        }
    }
}
