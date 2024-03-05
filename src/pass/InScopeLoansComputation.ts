import Pass from "lara-js/api/lara/pass/Pass.js";
import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";
import { Joinpoint } from "clava-js/api/Joinpoints.js";

import Loan from "../mir/Loan.js";
import Assignment from "../mir/Assignment.js";


export default class InScopeLoansComputation extends Pass {
    protected override _name: string = "InScopeLoansComputation";

    startNode: cytoscape.NodeSingular;

    constructor(startNode: cytoscape.NodeSingular) {
        super();
        this.startNode = startNode;
    }

    override _apply_impl($jp: Joinpoint): PassResult {
        this.#worklistDataflow(this.startNode);
        
        return new PassResult(this, $jp);
    }


    #worklistDataflow(root: cytoscape.NodeSingular) {
        // Worklist is FIFO Queue
        const worklist = Array.from(root.cy().nodes());
        const worklistSet = new Set(worklist);

        while (worklist.length > 0) {
            const node = worklist.shift() as cytoscape.NodeSingular;
            worklistSet.delete(node);

            const inSet: Set<Loan> = new Set();

            // Union of all incoming edges
            for (const inNode of node.incomers().nodes()) {
                const inScratch = inNode.scratch("_coral");
                const inner: Set<Loan> = new Set(inScratch.inScopeLoans);
                
                // Kills from assignment paths
                if (inScratch.assignment) {
                    const prefixes = (inScratch.assignment as Assignment).toPath.prefixes();
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
            const toKill: Set<Loan> = new Set();
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

    static _inScopeLoansTransferFn = (node: cytoscape.NodeSingular) => {
        const scratch = node.scratch("_coral");
        const toAdd: Set<Loan> = new Set();
        const toKill: Set<Loan> = new Set();

        // Union of all incoming edges
        const inScopeLoans: Set<Loan> = new Set();
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
            const prefixes = (scratch.assignment as Assignment).toPath.prefixes();
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
