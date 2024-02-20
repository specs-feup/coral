laraImport("weaver.Query");
laraImport("lara.pass.Pass");
laraImport("lara.pass.composition.Passes");
laraImport("lara.pass.results.AggregatePassResult");
laraImport("clava.code.StatementDecomposer");

laraImport("clava.pass.DecomposeDeclStmt");
laraImport("clava.pass.SimplifySelectionStmts");
laraImport("clava.code.SimplifyAssignment");

/**
 * Applies the normalization steps required for the Coral analysis
 */
class CoralNormalizer extends Pass {

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
    _apply_impl($jp) {
        Passes.apply($jp, [
            // Decomposes `int a,b=5,c;` into `int a; int b = 5; int c;` 
            new DecomposeDeclStmt(),
            // Takes the condition outside of if-else statements
            new SimplifySelectionStmts(new StatementDecomposer("TMP_")),
        ]);
        
        // `a += b` becomes `a = a + b` 
        const binaryOpIter = Query
            .searchFrom($jp, "binaryOp", { self: (self) => self.isAssignment && self.operator !== "=" });
        for (const $assign of binaryOpIter) {
            SimplifyAssignment($assign);
        }

        return new PassResult(this, $jp);
    }
}
