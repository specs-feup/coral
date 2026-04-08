import CoralFunctionWiseTransformation, {
    CoralFunctionWiseTransformationApplier,
} from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import NullabilityAnalyser from "./NullabilityAnalyser.js";
import NullabilityErrorReporting from "./NullabilityErrorReporting.js";

export default class NullabilityPipeline extends CoralFunctionWiseTransformation {
    fnApplier = NullabilityPipelineApplier;
}

class NullabilityPipelineApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        console.log(`[Nullck] Analysing function: ${this.fn.jp.name}`);

        // 1. Run the data-flow analysis
        const analyser = new NullabilityAnalyser(this.fn);
        const statesAtNodes = analyser.analyze();

        // 2. Report any contract violations found during analysis or at exit
        const reporter = new NullabilityErrorReporting(this.fn, statesAtNodes);
        reporter.report();
    }
}
