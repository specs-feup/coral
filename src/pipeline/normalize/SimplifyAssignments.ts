import { BinaryOp } from "@specs-feup/clava/api/Joinpoints.js";
import SimplifyAssignment from "@specs-feup/clava/api/clava/code/SimplifyAssignment.js";
import { NormalizationPass } from "@specs-feup/coral/pipeline/CoralNormalizer";
import { LaraJoinPoint } from "@specs-feup/lara/api/LaraJoinPoint.js";
import { Filter_WrapperVariant } from "@specs-feup/lara/api/weaver/Selector.js";

export default class SimplifyAssignments implements NormalizationPass<typeof BinaryOp> {
    query = {
        jp: BinaryOp,
        filter: (jp: BinaryOp) => jp.isAssignment && jp.operator !== "=",
    };

    apply($jp: BinaryOp) {
        SimplifyAssignment($jp);
    }
}
