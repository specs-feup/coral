import CoralFunctionWiseTransformation, {
    CoralFunctionWiseTransformationApplier,
} from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import NullabilityAnalyser from "./NullabilityAnalyser.js";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";

export default class NullabilityPipeline extends CoralFunctionWiseTransformation {
    fnApplier = NullabilityPipelineApplier;
}

class NullabilityPipelineApplier extends CoralFunctionWiseTransformationApplier {
 
    apply(): void {
        const analyser = new NullabilityAnalyser(this.fn);
        analyser.apply();
    
        console.log(`\n--- Nullability Analysis Results for ${this.fn.jp.name} ---`);
        for (const node of this.fn.controlFlowNodes.filterIs(CoralCfgNode)) {
            const states = node.nullabilityStates;
            if (states.size > 0) {
                const stateStr = Array.from(states.entries())
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ");
                console.log(`Line ${node.jp.line}: [ ${stateStr} ] -> ${node.jp.code.trim()}`);
            }
        }
    }
}
