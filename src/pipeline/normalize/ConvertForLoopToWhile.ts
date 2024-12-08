import { Loop } from "@specs-feup/clava/api/Joinpoints.js";
import ForToWhileStmt from "@specs-feup/clava/api/clava/code/ForToWhileStmt.js";
import { NormalizationContext, NormalizationPass } from "@specs-feup/coral/pipeline/CoralNormalizer";
import { Filter_WrapperVariant } from "@specs-feup/lara/api/weaver/Selector.js";

export default class ConvertForLoopToWhile implements NormalizationPass<typeof Loop> {
    query: {jp: typeof Loop, filter: Filter_WrapperVariant<typeof Loop>} = {
        jp: Loop,
        filter: { kind: "for" },
    };

    apply($jp: Loop, context: NormalizationContext) {
        ForToWhileStmt($jp, context.generateLabelName());
    }
}
