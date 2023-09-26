laraImport("lara.pass.Pass");
laraImport("coral.graph.DataflowAnalysis");
laraImport("coral.mir.Loan");

class InScopeLoansComputation extends Pass {

    /**
     * @type {cytoscape node}
     */
    startNode;

    constructor(startNode) {
        super();
        this.startNode = startNode;
    }

    _apply_impl($jp) {
        let changed = true;

        while (changed) {
            changed = DataflowAnalysis.transfer(this.startNode, InScopeLoansComputation._inScopeLoansTransferFn);
        }
        
        return new PassResult(this, $jp);
    }


    static _inScopeLoansTransferFn = (node) => {
        const scratch = node.scratch("_coral");
        const toAdd = new Set();
        const toKill = new Set();

        // Union of all incoming edges
        const inScopeLoans = new Set();
        for (const inNode of node.incomers().nodes()) {
            for (const loan of inNode.scratch("_coral").inScopeLoans) {
                inScopeLoans.add(loan);
            }
        }

        // Loans going out of scope
        for (const loan of inScopeLoans) {
            if (!loan.regionVar.points.has(node.id())) {
                toKill.add(loan);
            }
        }

        // New loan
        if (scratch.loan) {
            toAdd.add(scratch.loan);
        }

        // Check assignment paths
        if (scratch.assignment) {
            const prefixes = scratch.assignment.toPath.prefixes();
            for (const loan of inScopeLoans) {
                if (prefixes.some(prefix => loan.loanedPath.equals(prefix))) {
                    toKill.add(loan);
                }
            }
        }

        // Modify in-scope loans and check for changes
        for (const loan of toKill) {
            inScopeLoans.delete(loan);
        }
        for (const loan of toAdd) {
            inScopeLoans.add(loan);
        }

        let changed = false;
        if (inScopeLoans.size !== scratch.inScopeLoans.size) {
            changed = true;
        } else {
            for (const loan of scratch.inScopeLoans) {
                if (!inScopeLoans.has(loan)) {
                    changed = true;
                    break;
                }
            }
        }

        scratch.inScopeLoans = inScopeLoans;


        return changed;
    }

}

