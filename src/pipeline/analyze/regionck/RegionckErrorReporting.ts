import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import DanglingReferenceError from "@specs-feup/coral/error/borrow/DanglingReferenceError";
import MutableBorrowWhileBorrowedError from "@specs-feup/coral/error/borrow/MutableBorrowWhileBorrowedError";
import MutateWhileBorrowedError from "@specs-feup/coral/error/borrow/MutateWhileBorrowedError";
import UseWhileMutBorrowedError from "@specs-feup/coral/error/borrow/UseWhileMutBorrowedError";
import MoveWhileBorrowedError from "@specs-feup/coral/error/move/MoveWhileBorrowedError";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralTransformation, { CoralTransformationApplier } from "@specs-feup/coral/graph/CoralTransformation";
import Access from "@specs-feup/coral/mir/action/Access";
import Loan from "@specs-feup/coral/mir/action/Loan";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";


interface RegionckErrorReportingArgs {
    target: CoralFunctionNode.Class;
}

export default class RegionckErrorReporting extends CoralTransformation<RegionckErrorReportingArgs> {
    applier = RegionckErrorReportingApplier;
}

class RegionckErrorReportingApplier extends CoralTransformationApplier<RegionckErrorReportingArgs> {
    apply(): void {
        // TODO maybe should only have been reachable nodes?
        const nodes = this.args.target.controlFlowNodes.expectAll(
            CoralCfgNode,
            "Nodes were previously inited as CoralCfgNode",
        );
        for (const node of nodes) {
            for (const access of node.accesses) {
                for (const loan of this.#relevantLoans(node, access)) {
                    const ErrorType = this.#getError(access, loan);
                    if (ErrorType !== undefined) {
                        const $nextUse = this.#findNextUse(node, loan);
                        throw new ErrorType(node.jp, loan, $nextUse, access);
                    }
                }
            }
        }
    }

    #relevantLoans(node: CoralCfgNode.Class, access: Access): Loan[] {
        switch (access.depth) {
            case Access.Depth.SHALLOW:
                return Array.from(node.inScopeLoans).filter(
                    (loan) =>
                        access.path.equals(loan.path) ||
                        access.path.prefixes.some((prefix) => prefix.equals(loan.path)) ||
                        loan.path.shallowPrefixes.some((prefix) =>
                            prefix.equals(access.path),
                        ),
                );
            case Access.Depth.DEEP:
                return Array.from(node.inScopeLoans).filter(
                    (loan) =>
                        access.path.equals(loan.path) ||
                        access.path.prefixes.some((prefix) => prefix.equals(loan.path)) ||
                        loan.path.supportingPrefixes.some((prefix) =>
                            prefix.equals(access.path),
                        ),
                );
        }
    }

    #getError(access: Access, loan: Loan) {
        if (access.kind === Access.Kind.STORAGE_DEAD) {
            return DanglingReferenceError;
        } else if (loan.kind === Loan.Kind.MUTABLE) {
            return UseWhileMutBorrowedError;
        } else if (access.kind === Access.Kind.WRITE) {
            return MutateWhileBorrowedError;
        } else if (access.kind === Access.Kind.MUTABLE_BORROW) {
            return MutableBorrowWhileBorrowedError;
        } else if (access.isMove) {
            return MoveWhileBorrowedError;
        }
    }

    #findNextUse(fromNode: CoralCfgNode.Class, loan: Loan): Joinpoint | undefined {
        for (const { node, path } of fromNode.bfs((e) => e.is(ControlFlowEdge))) {
            if (path.length == 0) continue;
            const previousNode = path[path.length - 1].source.expect(CoralCfgNode);

            if (
                loan.region.has(previousNode) &&
                !loan.region.has(node.expect(CoralCfgNode))
            ) {
                return previousNode.jp;
            }
        }

        return undefined;
    }
}
