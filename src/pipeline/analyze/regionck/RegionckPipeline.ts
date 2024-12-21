import CoralFunctionWiseTransformation, { CoralFunctionWiseTransformationApplier } from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import ConstraintGenerator from "@specs-feup/coral/pipeline/analyze/regionck/ConstraintGenerator";
import InScopeLoansComputation from "@specs-feup/coral/pipeline/analyze/regionck/InScopeLoansComputation";
import RegionckErrorReporting from "@specs-feup/coral/pipeline/analyze/regionck/RegionckErrorReporting";
import UniversalRegionsErrorReporting from "@specs-feup/coral/pipeline/analyze/regionck/UniversalRegionsErrorReporting";

export default class RegionckPipeline extends CoralFunctionWiseTransformation {
    fnApplier = RegionckPipelineApplier;
}

class RegionckPipelineApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        const target = this.fn;
        this.graph
            .apply(new ConstraintGenerator({ target }))
            .apply(new InScopeLoansComputation({ target }))
            .apply(new RegionckErrorReporting({ target }))
            .apply(new UniversalRegionsErrorReporting({ target }));
    }
}

// class InferLifetimeBounds implements GraphTransformation {
//     #inferFunctionLifetimes: boolean;
//     #iterationLimit?: number;

//     constructor(inferFunctionLifetimes = true, iterationLimit?: number) {
//         this.#inferFunctionLifetimes = inferFunctionLifetimes;
//         this.#iterationLimit = iterationLimit;
//     }

//     apply(graph: BaseGraph.Class): void {
//         if (!graph.is(CoralGraph.TypeGuard)) {
//             throw new Error("InferLifetimeBounds can only be applied to CoralGraphs");
//         }

//         const coralGraph = graph.as(CoralGraph.Class);

//         if (this.#inferFunctionLifetimes) {
//             this.#inferLifetimes(coralGraph);
//         }
//     }
