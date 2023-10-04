import Pass from "lara-js/api/lara/pass/Pass.js";

import Loan from "../mir/Loan.js";

export default class InScopeLoansComputation extends Pass {

    /**
     * @type {cytoscape node}
     */
    startNode;

    constructor(startNode) {
        super();
        this.startNode = startNode;
    }

    _apply_impl($jp) {
        this.#worklistDataflow(this.startNode);
        
        return new PassResult(this, $jp);
    }


    #worklistDataflow(root) {
        // Worklist is FIFO Queue
        const worklist = Array.from(root.cy().nodes());
        const worklistSet = new Set(worklist);

        while (worklist.length > 0) {
            const node = worklist.shift();
            worklistSet.delete(node);

            const inSet = new Set();

            // Union of all incoming edges
            for (const inNode of node.incomers().nodes()) {
                const inScratch = inNode.scratch("_coral");
                const inner = new Set(inScratch.inScopeLoans);
                
                // Kills from assignment paths
                if (inScratch.assignment) {
                    const prefixes = inScratch.assignment.toPath.prefixes();
                    for (const loan of inScratch.inScopeLoans) {
                        if (prefixes.some(prefix => loan.loanedPath.equals(prefix))) {
                            inner.delete(loan);
                        }
                    }
                }

                // Gen from new loan
                if (inScratch.loan) {
                    inner.add(inScratch.loan);
                }

                // Union of all incoming edges
                for (const loan of inner) {
                    inSet.add(loan);
                }
            }

            // Kills from loans going out of scope in current node (?)
            const toKill = new Set();
            for (const loan of inSet) {
                if (!loan.regionVar.points.has(node.id())) {
                    toKill.add(loan);
                }
            }
            for (const loan of toKill) {
                inSet.delete(loan);
            }

            // Compare for changes
            let changed = false;
            if (node.scratch("_coral").inScopeLoans.size !== inSet.size) {
                changed = true;
            } else {
                for (const loan of node.scratch("_coral").inScopeLoans) {
                    if (!inSet.has(loan)) {
                        changed = true;
                        break;
                    }
                }
            }

            // Update real values and add successors to worklist
            if (changed) {
                node.scratch("_coral").inScopeLoans = inSet;
                for (const out of node.outgoers().nodes()) {
                    if (!worklistSet.has(out)) {
                        worklist.push(out);
                        worklistSet.add(out);
                    }
                }
            }
        }
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

