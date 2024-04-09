import Pass from "lara-js/api/lara/pass/Pass.js";
import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";
import { Joinpoint } from "clava-js/api/Joinpoints.js";

import Loan from "coral/mir/Loan";
import Access from "coral/mir/Access";
import { GraphTransformation } from "clava-flow/graph/Graph";
import CoralGraph from "coral/graph/CoralGraph";
import BaseGraph from "clava-flow/graph/BaseGraph";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import FlowNode from "clava-flow/flow/node/FlowNode";
import CoralNode from "coral/graph/CoralNode";


export default class InScopeLoansComputation implements GraphTransformation {
    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("InScopeLoansComputation can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        for (const functionEntry of coralGraph.functions) {
            this.#processFunction(functionEntry);
        }
    }

    #processFunction(functionEntry: FunctionEntryNode.Class) {
        // Worklist is FIFO Queue
        const worklist = new Set(functionEntry.reachableNodes);

        while (worklist.size > 0) {
            const node = worklist.values().next().value as FlowNode.Class;
            worklist.delete(node);

            if (!node.is(CoralNode.TypeGuard)) {
                throw new Error("InScopeLoansComputation: node is not a CoralNode");
            }

            const coralNode = node.as(CoralNode.Class);

            const inSet: Set<Loan> = new Set();

            // Union of all incoming edges
            for (const inNode of node.previousNodes) {
                if (!inNode.is(CoralNode.TypeGuard)) {
                    throw new Error("InScopeLoansComputation: node is not a CoralNode");
                }
                const inCoralNode = inNode.as(CoralNode.Class);
                const inner: Set<Loan> = new Set(inCoralNode.inScopeLoans);

                // Kills from assignment paths
                for (const assignment of inCoralNode.assignments) {
                    const prefixes = assignment.path.prefixes;
                    for (const loan of inCoralNode.inScopeLoans) {
                        if (prefixes.some((prefix) => loan.loanedPath.equals(prefix))) {
                            inner.delete(loan);
                        }
                    }
                }

                // Gen from new loan
                if (inCoralNode.loan) {
                    inner.add(inCoralNode.loan);
                }

                // Union of all incoming edges
                for (const loan of inner) {
                    inSet.add(loan);
                }
            }

            // Kills from loans going out of scope in current node (?)
            const toKill: Set<Loan> = new Set();
            for (const loan of inSet) {
                if (!loan.regionVar.points.has(node.id)) {
                    toKill.add(loan);
                }
            }
            for (const loan of toKill) {
                inSet.delete(loan);
            }

            // Compare for changes
            let changed = false;
            if (coralNode.inScopeLoans.size !== inSet.size) {
                changed = true;
            } else {
                for (const loan of coralNode.inScopeLoans) {
                    if (!inSet.has(loan)) {
                        changed = true;
                        break;
                    }
                }
            }

            // Update real values and add successors to worklist
            if (changed) {
                coralNode.inScopeLoans = inSet;
                for (const out of node.nextNodes) {
                    if (!worklist.has(out)) {
                        worklist.add(out);
                    }
                }
            }
        }
    }

    // TODO why does this exist?
    static #inScopeLoansTransferFn = (node: cytoscape.NodeSingular) => {
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
        const assignments = (scratch.accesses as Access[]).filter(
            (a) => a.mutability === Access.Mutability.WRITE,
        );
        for (const assignment of assignments) {
            const prefixes = assignment.path.prefixes;
            for (const loan of inScopeLoans) {
                if (prefixes.some((prefix) => loan.loanedPath.equals(prefix))) {
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
    };
}
