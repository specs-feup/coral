laraImport("lara.pass.Pass");

laraImport("coral.graph.DfsVisitor");
laraImport("coral.errors.CoralError");

laraImport("coral.mir.Loan");
laraImport("coral.mir.Access");
laraImport("coral.ty.BorrowKind");

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
            if (access.mutability === AccessMutability.READ && loan.kind === BorrowKind.SHARED) {
                continue;
            }

            // otherwise, report an error, because we have an access
            // that conflicts with an in-scope borrow
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
        const nextUse = undefined; // TODO: Calculate next use
    
        // Line no
        const linePaddingSize = Math.max($jp.line, loan.$jp.line).toString().length + 1;
        const loanLineNum = loan.$jp.line.toString().padEnd(linePaddingSize, " ");
        const assignmLine = $jp.line.toString().padEnd(linePaddingSize, " ");
        const nextUseLine = "".padEnd(linePaddingSize, " ");
        const linePadding = " ".repeat(linePaddingSize);
        
        let error = `error[E0506]: Cannot write to '${access.path}' while borrowed\n`;
        error += ` ${"-".repeat(linePaddingSize)}> ${$jp.filename}:${$jp.line}\n`;
        error += ` ${nextUseLine}|\t\n`;
        error += ` ${loanLineNum}|\t${loan.node.data().stmts[0].code}\n`;
        error += ` ${linePadding}|\t\t(${loan.borrowKind}) borrow of '${loan.loanedPath}' occurs here\n`;
        error += ` ${assignmLine}|\t${$jp.code}\n`;
        error += ` ${linePadding}|\t\twrite to '${access.path}' occurs here, while borrow is still active\n`;
        error += ` ${nextUseLine}|\t\n`;
        error += ` ${linePadding}|\t\tborrow is later used here\n`;
        error += ` ${linePadding}|\t\n`;

        throw new CoralError(error);
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

