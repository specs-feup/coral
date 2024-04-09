import Pass from "lara-js/api/lara/pass/Pass.js";
import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";
import CfgNodeType from "clava-js/api/clava/graphs/cfg/CfgNodeType.js";

import MutateWhileBorrowedError from "coral/error/borrow/MutateWhileBorrowedError";
import UseWhileMutBorrowedError from "coral/error/borrow/UseWhileMutBorrowedError";
import MoveWhileBorrowedError from "coral/error/move/MoveWhileBorrowedError";
import Loan from "coral/mir/Loan";
import Access from "coral/mir/Access";
import BorrowKind from "coral/mir/ty/BorrowKind";
import { Joinpoint } from "clava-js/api/Joinpoints.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";
import MutableBorrowWhileBorrowedError from "coral/error/borrow/MutableBorrowWhileBorrowedError";
import { GraphTransformation } from "clava-flow/graph/Graph";
import BaseGraph from "clava-flow/graph/BaseGraph";
import CoralGraph from "coral/graph/CoralGraph";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import CoralNode from "coral/graph/CoralNode";
import DanglingReferenceError from "coral/error/borrow/DanglingReferenceError";

    
export default class RegionckErrorReporting implements GraphTransformation {
    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("RegionckErrorReporting can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        for (const functionEntry of coralGraph.functions) {
            this.#processFunction(functionEntry);
        }
    }

    #processFunction(functionEntry: FunctionEntryNode.Class) {
        for (const node of functionEntry.reachableNodes) {
            if (!node.is(CoralNode.TypeGuard)) {
                continue;
            }

            const coralNode = node.as(CoralNode.Class);
            for (const access of coralNode.accesses) {
                for (const loan of this.#relevantLoans(coralNode, access)) {
                    this.#checkAccess(coralNode, access, loan);
                }
            }
        }
    }

    #relevantLoans(node: CoralNode.Class, access: Access): Loan[] {
        switch (access.depth) {
            case Access.Depth.SHALLOW:
                return Array.from(node.inScopeLoans).filter(
                    (loan) =>
                        access.path.equals(loan.loanedPath) ||
                        access.path.prefixes.some((prefix) =>
                            prefix.equals(loan.loanedPath),
                        ) ||
                        loan.loanedPath.shallowPrefixes.some((prefix) =>
                            prefix.equals(access.path),
                        ),
                );
            case Access.Depth.DEEP:
                return Array.from(node.inScopeLoans).filter(
                    (loan) =>
                        access.path.equals(loan.loanedPath) ||
                        access.path.prefixes.some((prefix) =>
                            prefix.equals(loan.loanedPath),
                        ) ||
                        loan.loanedPath.supportingPrefixes.some((prefix) =>
                            prefix.equals(access.path),
                        ),
                );
        }
    }

    #checkAccess(node: CoralNode.Class, access: Access, loan: Loan) {
        if (access.mutability === Access.Mutability.STORAGE_DEAD) {
            const $nextUse = this.#findNextUse(node, loan);
            throw new DanglingReferenceError(node.jp, loan, $nextUse, access);
        } else if (loan.borrowKind === BorrowKind.MUTABLE) {
            const $nextUse = this.#findNextUse(node, loan);
            throw new UseWhileMutBorrowedError(node.jp, loan, $nextUse, access);
        } else if (access.mutability === Access.Mutability.WRITE) {
            const $nextUse = this.#findNextUse(node, loan);
            throw new MutateWhileBorrowedError(node.jp, loan, $nextUse, access);
        } else if (access.mutability === Access.Mutability.MUTABLE_BORROW) {
            const $nextUse = this.#findNextUse(node, loan);
            throw new MutableBorrowWhileBorrowedError(node.jp, loan, $nextUse, access);
        } else if (access.isMove) {
            const $nextUse = this.#findNextUse(node, loan);
            throw new MoveWhileBorrowedError(node.jp, loan, $nextUse, access);
        }
    }

    #findNextUse(node: CoralNode.Class, loan: Loan): Joinpoint {
        for (const [vNode, path] of node.bfs((e) => e.is(ControlFlowEdge.TypeGuard))) {
            if (path.length == 0) continue;
            const previousNode = path[path.length - 1].source;
            if (
                loan.regionVar.points.has(previousNode.id)
                && !loan.regionVar.points.has(vNode.id)
            ) {
                if (previousNode.is(CoralNode.TypeGuard)) {
                    return previousNode.as(CoralNode.Class).jp;
                }
            }
        }

        throw new Error("findNextUse: Could not find next use");
    }
}
