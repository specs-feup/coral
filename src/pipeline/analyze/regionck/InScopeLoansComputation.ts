import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralTransformation, { CoralTransformationApplier } from "@specs-feup/coral/graph/CoralTransformation";
import Loan from "@specs-feup/coral/mir/action/Loan";

interface InScopeLoansComputationArgs {
    target: CoralFunctionNode.Class;
}

export default class InScopeLoansComputation extends CoralTransformation<InScopeLoansComputationArgs> {
    applier = InScopeLoansComputationApplier;
}

class InScopeLoansComputationApplier extends CoralTransformationApplier<InScopeLoansComputationArgs> {
    apply(): void {
        // Worklist is FIFO Queue
        // TODO maybe should only have been reachable nodes?
        const nodes = this.args.target.controlFlowNodes.expectAll(
            CoralCfgNode,
            "Nodes were previously inited as CoralCfgNode",
        );
        const worklist = new Set(nodes);

        while (worklist.size > 0) {
            const node = worklist.values().next().value!;
            worklist.delete(node);

            const inSet: Set<Loan> = new Set();

            // Union of all incoming edges
            for (const inNode of node.previousNodes) {
                if (!inNode.is(CoralCfgNode)) {
                    throw new Error("InScopeLoansComputation: node is not a CoralNode");
                }
                const inCoralNode = inNode.as(CoralCfgNode);
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
            if (node.inScopeLoans.size !== inSet.size) {
                changed = true;
            } else {
                for (const loan of node.inScopeLoans) {
                    if (!inSet.has(loan)) {
                        changed = true;
                        break;
                    }
                }
            }

            // Update real values and add successors to worklist
            if (changed) {
                node.inScopeLoans = inSet;
                for (const out of node.nextNodes) {
                    if (!worklist.has(out)) {
                        worklist.add(out);
                    }
                }
            }
        }
    }
}
