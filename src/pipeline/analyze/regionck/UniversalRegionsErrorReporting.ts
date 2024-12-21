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
        for (const region of this.args.target.universalRegionVars) {
            if (!isNaN(Number(region.name.slice(1)))) {
                continue;
            }

            const ends = Array.from(region.points)
                .filter((point) => point.startsWith("end("))
                .map((point) => point.slice(4, -1));

            for (const end of ends) {
                if (region.name === end) {
                    continue;
                }

                const hasBound = regionck.bounds.some(
                    (b) => b.name === region.name && b.bound === end,
                );

                if (!hasBound) {
                    const relevantConstraint = this.args.target.regionConstraints.find(
                        (c) =>
                            c.sup.name === region.name && c.addedEnds.has(`end(${end})`),
                    );
                    if (!relevantConstraint) {
                        throw new Error("No relevant constraint found");
                    }
                    throw new MissingLifetimeBoundError(
                        region,
                        end,
                        relevantConstraint,
                        this.args.target.jp,
                    );
                }
            }
        }
    }
}
