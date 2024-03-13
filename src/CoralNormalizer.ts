import Query from "lara-js/api/weaver/Query.js";
import Pass from "lara-js/api/lara/pass/Pass.js";
import Passes from "lara-js/api/lara/pass/composition/Passes.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";
import StatementDecomposer from "clava-js/api/clava/code/StatementDecomposer.js";
import DecomposeDeclStmt from "clava-js/api/clava/pass/DecomposeDeclStmt.js";
import SimplifySelectionStmts from "clava-js/api/clava/pass/SimplifySelectionStmts.js";
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
        Passes.apply(
            $jp,
            // Decomposes `int a,b=5,c;` into `int a; int b = 5; int c;`
            new DecomposeDeclStmt() as Pass,
            // Takes the condition outside of if-else statements
            new SimplifySelectionStmts(new StatementDecomposer("TMP_")) as Pass,
        );

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
