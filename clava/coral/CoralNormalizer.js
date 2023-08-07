laraImport("weaver.Query");
laraImport("lara.pass.Pass");
laraImport("lara.pass.composition.Passes");
laraImport("lara.pass.results.AggregatePassResult");
laraImport("clava.code.StatementDecomposer");

laraImport("clava.pass.DecomposeDeclStmt");
laraImport("clava.pass.SimplifySelectionStmts");
laraImport("clava.code.SimplifyAssignment");

laraImport("clava.coral.pass.LifetimeElision");

/**
 * Applies the normalization steps required for the Coral analysis
 */
class CoralNormalizer extends Pass {

    #statementDecomposer;

    constructor() {
        super();

        this.#statementDecomposer = new StatementDecomposer();
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
