import CoralFunctionWiseTransformation, { CoralFunctionWiseTransformationApplier } from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import ConstraintGenerator from "@specs-feup/coral/pipeline/analyze/regionck/ConstraintGenerator";
import InferRegionBounds from "@specs-feup/coral/pipeline/analyze/regionck/InferRegionBounds";
import InScopeLoansComputation from "@specs-feup/coral/pipeline/analyze/regionck/InScopeLoansComputation";
import RegionckErrorReporting from "@specs-feup/coral/pipeline/analyze/regionck/RegionckErrorReporting";
import UniversalRegionsErrorReporting from "@specs-feup/coral/pipeline/analyze/regionck/UniversalRegionsErrorReporting";

export default class RegionckPipeline extends CoralFunctionWiseTransformation {
    fnApplier = RegionckPipelineApplier;
}

class RegionckPipelineApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        if (this.graph.config.inferFunctionLifetimeBounds) {
            if (this.graph.config.inferFunctionLifetimeBoundsIterationLimit === 0) {
                // TODO
                throw new Error("InferFunctionLifetimeBoundsIterationLimit must be greater than 0");
            }
            this.graph
                .apply(new InferRegionBounds({ iterationLimit: this.graph.config.inferFunctionLifetimeBoundsIterationLimit }));
        } else {
            const target = this.fn;
            this.graph
                .apply(new ConstraintGenerator({ target }))
                .apply(new InScopeLoansComputation({ target }))
                .apply(new RegionckErrorReporting({ target }))
                .apply(new UniversalRegionsErrorReporting({ target }));
        }
    }
}
