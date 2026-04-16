import CoralTransformation, { CoralTransformationApplier } from "@specs-feup/coral/graph/CoralTransformation";
import ControlFlowAnnotator from "@specs-feup/coral/pipeline/analyze/annotate/ControlFlowAnnotator";
import SignatureAnnotator from "@specs-feup/coral/pipeline/analyze/annotate/SignatureAnnotator";
import NullabilityAnnotator from "./NullabilityAnnotator.js";

export default class CoralAnnotator extends CoralTransformation {
    applier = CoralAnnotatorApplier;
}

class CoralAnnotatorApplier extends CoralTransformationApplier {
    apply(): void {
        this.graph
            .apply(new SignatureAnnotator())
            .apply(new ControlFlowAnnotator())
            .apply(new NullabilityAnnotator());
    }
}
