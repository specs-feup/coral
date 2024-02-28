laraImport("lara.pass.Pass");

laraImport("coral.graph.DfsVisitor");
laraImport("coral.error.UseWhileMutBorrowError");

laraImport("coral.mir.Loan");
laraImport("coral.mir.Access");
laraImport("coral.mir.ty.BorrowKind");

class BcErrorReporting extends Pass {

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
            BcErrorReporting._errorReportingVisitorFn
        );

        return new PassResult(this, $jp);
    }

    static _errorReportingVisitorFn = (node) => {
        for (const access of node.scratch("_coral").accesses) {
            BcErrorReporting._access_legal(node, access);
        }
    }


    /**
     * @param {cytoscape node} node
     * @param {Access} access
     * @returns {boolean}
     */
    static _access_legal = (node, access) => {
        for (const loan of BcErrorReporting._relevantLoans(node.scratch("_coral"), access)) {
            // shared borrows like '&x' still permit reads from 'x' (but not writes)
            if (access.mutability === AccessMutability.READ && loan.borrowKind === BorrowKind.SHARED) {
                continue;
            }

            // otherwise, report an error, because we have an access
            // that conflicts with an in-scope borrow

            // TODO-pg: phrasing this as "write" is not true: might be read of a mutable reference
            BcErrorReporting._prepareWriteWhileBorrowedError(node, access, loan);
        }

        // Returns that no changes were made
        return false;
    }

    static _findNextUse = (node, access) => {
    }

    static _prepareWriteWhileBorrowedError = (node, access, loan) => {
        // throw new CoralError(`Access to ${access.path} @ ${node.id()} conflicts with borrow of ${loan.loanedPath} @ ${loan.node.id()}`);
        const $jp = node.data().stmts[0];
        
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
            throw new Error("_prepareWriteWhileBorrowedError: Could not find next use");
        }

        let nextUse = dfsResult.path[dfsResult.path.length-2].source();
        let $nextUse;

        switch (nextUse.data().type) {
            case CfgNodeType.INST_LIST:
                $nextUse = nextUse.data().stmts[0];
                break;
            case CfgNodeType.IF:
            case CfgNodeType.RETURN:
            case CfgNodeType.LOOP:
                $nextUse = nextUse.data().nodeStmt;
                break;
            default:
                throw new Error(`_prepareWriteWhileBorrowedError: Unknown node type ${nextUse.data().type}`);
        }
    
        throw new UseWhileMutBorrowError($jp, loan, $nextUse, access);
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

