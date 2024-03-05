import Pass from "lara-js/api/lara/pass/Pass.js";
import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";
import CfgNodeType from "clava-js/api/clava/graphs/cfg/CfgNodeType.js";

import DfsVisitor from "../graph/DfsVisitor.js";
import MutateWhileBorrowedError from "../error/borrow/MutateWhileBorrowedError.js";
import UseWhileMutBorrowedError from "../error/borrow/UseWhileMutBorrowedError.js";
import Loan from "../mir/Loan.js";
import Access from "../mir/Access.js";
import BorrowKind from "../mir/ty/BorrowKind.js";
import { Joinpoint } from "clava-js/api/Joinpoints.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";

export default class RegionckErrorReporting extends Pass {
    protected override _name: string = "RegionckErrorReporting";

    startNode: cytoscape.NodeSingular;

    constructor(startNode: cytoscape.NodeSingular) {
        super();
        this.startNode = startNode;
    }

    override _apply_impl($jp: Joinpoint): PassResult {
        DfsVisitor.visit(this.startNode, RegionckErrorReporting._errorReportingVisitorFn);

        return new PassResult(this, $jp);
    }

    static _errorReportingVisitorFn = (node: cytoscape.NodeSingular) => {
        for (const access of node.scratch("_coral").accesses) {
            RegionckErrorReporting._access_legal(node, access);
        }

        // Returns that no changes were made
        return false;
    };

    static _access_legal = (node: cytoscape.NodeSingular, access: Access): boolean => {
        for (const loan of RegionckErrorReporting._relevantLoans(
            node.scratch("_coral"),
            access,
        )) {
            if (loan.borrowKind === BorrowKind.MUTABLE) {
                const $nextUse = this._findNextUse(node, loan);
                throw new UseWhileMutBorrowedError(
                    node.data().stmts[0],
                    loan,
                    $nextUse,
                    access,
                );
            } else if (access.mutability === Access.Mutability.WRITE) {
                const $nextUse = this._findNextUse(node, loan);
                throw new MutateWhileBorrowedError(
                    node.data().stmts[0],
                    loan,
                    $nextUse,
                    access,
                );
            }
        }

        // Returns that no changes were made
        return false;
    };

    static _findNextUse = (node: cytoscape.NodeSingular, loan: Loan): Joinpoint => {
        // Calculate a possible next use
        const dfsResult = node
            .cy()
            .elements()
            .dfs({
                root: node,
                visit: (
                    v: cytoscape.NodeSingular,
                    e: cytoscape.EdgeSingular | undefined,
                    u: cytoscape.NodeSingular | undefined,
                    i: number,
                    depth: number,
                ) => {
                    if (depth == 0) return;

                    if (
                        u !== undefined &&
                        loan.regionVar.points.has(u.id()) &&
                        !loan.regionVar.points.has(v.id())
                    ) {
                        return true;
                    }
                },
                directed: true,
            });
        if (dfsResult.found === undefined) {
            throw new Error("_findNextUse: Could not find next use");
        }

        const nextUse = (
            dfsResult.path[dfsResult.path.length - 2] as cytoscape.EdgeSingular
        ).source();

        switch (nextUse.data().type) {
            case CfgNodeType.INST_LIST:
                return nextUse.data().stmts[0];
            case CfgNodeType.IF:
            case CfgNodeType.RETURN:
            case CfgNodeType.LOOP:
            case CfgNodeType.COND:
                return nextUse.data().nodeStmt;
            default:
                throw new Error(`_findNextUse: Unknown node type ${nextUse.data().type}`);
        }
    };

    static _relevantLoans = (scratch: cytoscape.Scratchpad, access: Access): Loan[] => {
        if (access.depth === Access.Depth.SHALLOW) {
            return Array.from(scratch.inScopeLoans as Loan[]).filter(
                (loan) =>
                    access.path.equals(loan.loanedPath) ||
                    access.path
                        .prefixes()
                        .some((prefix) => prefix.equals(loan.loanedPath)) ||
                    loan.loanedPath
                        .shallowPrefixes()
                        .some((prefix) => prefix.equals(access.path)),
            );
        } else if (access.depth === Access.Depth.DEEP) {
            return Array.from(scratch.inScopeLoans as Loan[]).filter(
                (loan) =>
                    access.path.equals(loan.loanedPath) ||
                    access.path
                        .prefixes()
                        .some((prefix) => prefix.equals(loan.loanedPath)) ||
                    loan.loanedPath
                        .supportingPrefixes()
                        .some((prefix) => prefix.equals(access.path)),
            );
        } else {
            throw new Error("Unknown access depth " + access.depth);
        }
    };
}