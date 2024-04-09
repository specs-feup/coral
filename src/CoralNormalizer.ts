import Query from "lara-js/api/weaver/Query.js";
import Pass from "lara-js/api/lara/pass/Pass.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";
import SimplifyAssignment from "clava-js/api/clava/code/SimplifyAssignment.js";
import { LaraJoinPoint } from "lara-js/api/LaraJoinPoint.js";
import { BinaryOp } from "clava-js/api/Joinpoints.js";

/**
 * Applies the normalization steps required for the Coral analysis
 */
export default class CoralNormalizer extends Pass {
    protected override _name: string = this.constructor.name;
    constructor() {
        super();
    }

    /**
     * Apply tranformation to
     * @abstract Contains default implementation only if matchJoinPoint and transformJoinpoint are implemented
     *
     * @param {JoinPoint} $jp Joint point on which the pass will be applied
     * @return {PassResult} Results of applying this pass to the given joint point
     */
    override _apply_impl($jp: LaraJoinPoint): PassResult {
        // TODO:
        //       ternary into if
        //       a = (b + (c=d)) into c=d; a=b+c
        //       -> into *().
        //       [] into *(+)

        // for (const $stmt of Query.searchFrom($jp, "statement")) {
        //     new StatementDecomposer("__coral_tmp_", 0).decomposeAndReplace($stmt as Statement);
        // }
        
        // `a += b` becomes `a = a + b`
        const binaryOpIter = Query.searchFrom($jp, "binaryOp", {
            self: (self: LaraJoinPoint) =>
                (self as BinaryOp).isAssignment && (self as BinaryOp).operator !== "=",
        });
        for (const $assign of binaryOpIter) {
            SimplifyAssignment($assign as BinaryOp);
        }

        return new PassResult(this, $jp);
    }
}
