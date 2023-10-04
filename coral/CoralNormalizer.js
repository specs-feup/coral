import Query from "lara-js/api/weaver/Query.js";
import Pass from "lara-js/api/lara/pass/Pass.js";
import PassResult from "lara-js/api/lara/pass/PassResult.js";
import Passes from "lara-js/api/lara/pass/composition/Passes.js";
import AggregatePassResult from "lara-js/api/lara/pass/results/AggregatePassResult.js";
import StatementDecomposer from "clava-js/api/clava/code/StatementDecomposer.js";
import SimplifySelectionStmts from "clava-js/api/clava/pass/SimplifySelectionStmts.js";
import SimplifyAssignment from "clava-js/api/clava/code/SimplifyAssignment.js";

import LifetimeElision from "./pass/LifetimeElision.js";


/**
 * Applies the normalization steps required for the Coral analysis
 */
export default class CoralNormalizer extends Pass {

    #statementDecomposer;

    constructor() {
        super();

        this.#statementDecomposer = new StatementDecomposer("TMP_");
    }


    /**
   * Apply tranformation to
   * @abstract Contains default implementation only if matchJoinPoint and transformJoinpoint are implemented
   * 
   * @param {JoinPoint} $jp Joint point on which the pass will be applied
   * @return {PassResult} Results of applying this pass to the given joint point
   */
    _apply_impl($jp) {
        Passes.apply($jp, [
            new DecomposeDeclStmt(),
            new SimplifySelectionStmts(this.#statementDecomposer),
        ]);


        
        const binaryOpIter = Query.searchFrom($jp, "binaryOp", {
            self: (self) => self.isAssignment && self.operator !== "=",
        });

        for (const $assign of binaryOpIter) {
            SimplifyAssignment($assign);
        }

        // TODO: Verify and report errors
        const elision = new LifetimeElision();
        elision.apply();

        return new PassResult(this, $jp);
    }

}
