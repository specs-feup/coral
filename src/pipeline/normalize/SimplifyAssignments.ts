import { BinaryOp } from "@specs-feup/clava/api/Joinpoints.js";
import SimplifyAssignment from "@specs-feup/clava/api/clava/code/SimplifyAssignment.js";
import { NormalizationPass } from "@specs-feup/coral/pipeline/CoralNormalizer";
import { LaraJoinPoint } from "@specs-feup/lara/api/LaraJoinPoint.js";
import { Filter_WrapperVariant } from "@specs-feup/lara/api/weaver/Selector.js";

export default class SimplifyAssignments implements NormalizationPass<typeof BinaryOp> {
    query: { jp: typeof BinaryOp; filter: Filter_WrapperVariant<typeof BinaryOp> } = {
        jp: BinaryOp,
        filter: {
            self: (self: LaraJoinPoint) =>
                (self as BinaryOp).isAssignment && (self as BinaryOp).operator !== "=",
        },
    };

    apply($jp: BinaryOp) {
        SimplifyAssignment($jp);
    }
}
