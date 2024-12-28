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
            for (const [bound, cause] of region.missingBounds(this.args.target.bounds)) {
                throw new MissingLifetimeBoundError(bound, cause, this.args.target.jp);
            }
        }
    }
}
