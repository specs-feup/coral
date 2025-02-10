import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralFunctionWiseTransformation, { CoralFunctionWiseTransformationApplier } from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import CoralTransformation, { CoralTransformationApplier } from "@specs-feup/coral/graph/CoralTransformation";
import ConstraintGenerator from "@specs-feup/coral/pipeline/analyze/regionck/ConstraintGenerator";
import InferRegionBounds from "@specs-feup/coral/pipeline/analyze/regionck/InferRegionBounds";
import InScopeLoansComputation from "@specs-feup/coral/pipeline/analyze/regionck/InScopeLoansComputation";
import RegionckErrorReporting from "@specs-feup/coral/pipeline/analyze/regionck/RegionckErrorReporting";
import UniversalRegionsErrorReporting from "@specs-feup/coral/pipeline/analyze/regionck/UniversalRegionsErrorReporting";
import { NodeCollection } from "@specs-feup/flow/graph/NodeCollection";

export default class RegionckPipeline extends CoralTransformation {
    applier = RegionckPipelineApplier;
}

class RegionckPipelineApplier extends CoralTransformationApplier {
    apply(): void {
        for (const target of this.#getNoInferBoundsTargets()) {
            this.graph
                .apply(new ConstraintGenerator({ target }))
                .apply(new InScopeLoansComputation({ target }))
                .apply(new RegionckErrorReporting({ target }))
                .apply(new UniversalRegionsErrorReporting({ target }));
        }

        if (this.graph.config.inferFunctionLifetimeBounds) {
            if (this.graph.config.inferFunctionLifetimeBoundsIterationLimit === 0) {
                throw new Error("InferFunctionLifetimeBoundsIterationLimit must be greater than 0");
            }
            this.graph
                .apply(new InferRegionBounds({
                    iterationLimit: this.graph.config.inferFunctionLifetimeBoundsIterationLimit,
                }));
        }
    }

    #getNoInferBoundsTargets(): NodeCollection<CoralFunctionNode.Class> {
        if (this.graph.config.inferFunctionLifetimeBounds) {
            return this.graph.functionsToAnalyze.filter(fn => fn.inferRegionBoundsState === InferRegionBounds.FunctionState.IGNORE);
        } else {
            return this.graph.functionsToAnalyze;
        }
    }
}
