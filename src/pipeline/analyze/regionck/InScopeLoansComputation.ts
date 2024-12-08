import Loan from "@specs-feup/coral/mir/Loan";
import { GraphTransformation } from "clava-flow/graph/Graph";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import BaseGraph from "clava-flow/graph/BaseGraph";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import FlowNode from "clava-flow/flow/node/FlowNode";
import CoralNode from "@specs-feup/coral/graph/CoralNode";

export default class InScopeLoansComputation implements GraphTransformation {
    #targetFunction: FunctionEntryNode.Class;

    constructor(targetFunction: FunctionEntryNode.Class) {
        this.#targetFunction = targetFunction;
    }

    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("InScopeLoansComputation can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        this.#processFunction(this.#targetFunction);
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
                for (const loan of inCoralNode.loans) {
                    inner.add(loan);
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
}
