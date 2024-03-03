laraImport("lara.pass.Pass");

laraImport("coral.graph.DfsVisitor");
laraImport("coral.error.borrow.MutateWhileBorrowedError");
laraImport("coral.error.borrow.UseWhileMutBorrowedError");

laraImport("coral.mir.Loan");
laraImport("coral.mir.Access");
laraImport("coral.mir.ty.BorrowKind");

class RegionckErrorReporting extends Pass {

    /**
     * @type {cytoscape node}
     */
    startNode;

    constructor(startNode) {
        super();
        this.startNode = startNode;
    }

    _apply_impl($jp) {
        DfsVisitor.visit(
            this.startNode,
            RegionckErrorReporting._errorReportingVisitorFn
        );

        return new PassResult(this, $jp);
    }

    static _errorReportingVisitorFn = (node) => {
        for (const access of node.scratch("_coral").accesses) {
            RegionckErrorReporting._access_legal(node, access);
        }
    }


    /**
     * @param {cytoscape node} node
     * @param {Access} access
     * @returns {boolean}
     */
    static _access_legal = (node, access) => {
        for (const loan of RegionckErrorReporting._relevantLoans(node.scratch("_coral"), access)) {
            if (loan.borrowKind === BorrowKind.MUTABLE) {
                const $nextUse = this._findNextUse(node, loan);
                throw new UseWhileMutBorrowedError(node.data().stmts[0], loan, $nextUse, access);
            } else if (access.mutability === AccessMutability.WRITE) {
                const $nextUse = this._findNextUse(node, loan);
                throw new MutateWhileBorrowedError(node.data().stmts[0], loan, $nextUse, access);
            }
        }

        // Returns that no changes were made
        return false;
    }

    static _findNextUse = (node, loan) => {        
        // Calculate a possible next use
        const dfsResult = node.cy().elements().dfs(
            node,
            (v, e, u, i, depth) => {
                if (depth == 0)
                    return;
                
                if (loan.regionVar.points.has(u.id()) && !loan.regionVar.points.has(v.id())) {
                    return true;
                }
            },
            true
        );
        if (dfsResult.found === undefined) {
            throw new Error("_findNextUse: Could not find next use");
        }

        const nextUse = dfsResult.path[dfsResult.path.length-2].source();

        switch (nextUse.data().type) {
            case CfgNodeType.INST_LIST:
                return nextUse.data().stmts[0];
            case CfgNodeType.IF:
            case CfgNodeType.RETURN:
            case CfgNodeType.LOOP:
                return nextUse.data().nodeStmt;
            default:
                throw new Error(`_findNextUse: Unknown node type ${nextUse.data().type}`);
        }
    }

    /**
     * @param {Scratch} scratch
     * @param {Access} access
     * @returns {boolean}
     */
    static _relevantLoans = (scratch, access) => {
        if (access.depth === AccessDepth.SHALLOW) {
            return Array.from(scratch.inScopeLoans).filter(loan =>
                access.path.equals(loan.loanedPath) ||
                access.path.prefixes().some(prefix => prefix.equals(loan.loanedPath)) ||
                loan.loanedPath.shallowPrefixes().some(prefix => prefix.equals(access.path))
            );
        } else if (access.depth === AccessDepth.DEEP) {
            return Array.from(scratch.inScopeLoans).filter(loan =>
                access.path.equals(loan.loanedPath) ||
                access.path.prefixes().some(prefix => prefix.equals(loan.loanedPath)) ||
                loan.loanedPath.supportingPrefixes().some(prefix => prefix.equals(access.path))
            );
        } else {
            throw new Error("Unknown access depth " + access.depth);
        }
    }

}
