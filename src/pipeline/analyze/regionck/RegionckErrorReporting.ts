

export default class RegionckErrorReporting implements GraphTransformation {
    #shouldCheckUniversalRegions: boolean;

    constructor(checkUniversalRegions: boolean = true) {
        this.#shouldCheckUniversalRegions = checkUniversalRegions;
    }

    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("RegionckErrorReporting can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        for (const functionEntry of coralGraph.functions) {
            this.#checkAccessViolations(functionEntry);
            if (this.#shouldCheckUniversalRegions) {
                this.#checkUniversalRegions(coralGraph.getRegionck(functionEntry));
            }
        }
    }

    #checkUniversalRegions(regionck: Regionck) {
        for (const region of regionck.universalRegionVars) {
            if (!isNaN(Number(region.name.slice(1)))) {
                continue;
            }

            const ends = Array.from(region.points)
                .filter((point) => point.startsWith("end("))
                .map((point) => point.slice(4, -1));

            for (const end of ends) {
                if (region.name === end) {
                    continue;
                }

                const hasBound = regionck.bounds.some(
                    (b) => b.name === region.name && b.bound === end,
                );

                if (!hasBound) {
                    const relevantConstraint = regionck.constraints.find(
                        (c) =>
                            c.sup.name === region.name && c.addedEnds.has(`end(${end})`),
                    );
                    if (!relevantConstraint) {
                        throw new Error("No relevant constraint found");
                    }
                    throw new MissingLifetimeBoundError(
                        region,
                        end,
                        relevantConstraint,
                        regionck.functionEntry.jp,
                    );
                }
            }
        }
    }

    #checkAccessViolations(functionEntry: FunctionEntryNode.Class) {
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
                        access.#path.equals(loan.loanedPath) ||
                        access.#path.prefixes.some((prefix) =>
                            prefix.equals(loan.loanedPath),
                        ) ||
                        loan.loanedPath.shallowPrefixes.some((prefix) =>
                            prefix.equals(access.#path),
                        ),
                );
            case Access.Depth.DEEP:
                return Array.from(node.inScopeLoans).filter(
                    (loan) =>
                        access.#path.equals(loan.loanedPath) ||
                        access.#path.prefixes.some((prefix) =>
                            prefix.equals(loan.loanedPath),
                        ) ||
                        loan.loanedPath.supportingPrefixes.some((prefix) =>
                            prefix.equals(access.#path),
                        ),
                );
        }
    }

    #checkAccess(node: CoralNode.Class, access: Access, loan: Loan) {
        if (access.#type === Access.Kind.STORAGE_DEAD) {
            const $nextUse = this.#findNextUse(node, loan);
            throw new DanglingReferenceError(node.jp, loan, $nextUse, access);
        } else if (loan.kind === Loan.Kind.MUTABLE) {
            const $nextUse = this.#findNextUse(node, loan);
            throw new UseWhileMutBorrowedError(node.jp, loan, $nextUse, access);
        } else if (access.#type === Access.Kind.WRITE) {
            const $nextUse = this.#findNextUse(node, loan);
            throw new MutateWhileBorrowedError(node.jp, loan, $nextUse, access);
        } else if (access.#type === Access.Kind.MUTABLE_BORROW) {
            const $nextUse = this.#findNextUse(node, loan);
            throw new MutableBorrowWhileBorrowedError(node.jp, loan, $nextUse, access);
        } else if (access.isMove) {
            const $nextUse = this.#findNextUse(node, loan);
            throw new MoveWhileBorrowedError(node.jp, loan, $nextUse, access);
        }
    }

    #findNextUse(node: CoralNode.Class, loan: Loan): Joinpoint | undefined {
        for (const [vNode, path] of node.bfs((e) => e.is(ControlFlowEdge.TypeGuard))) {
            if (path.length == 0) continue;
            const previousNode = path[path.length - 1].source;
            if (
                loan.regionVar.points.has(previousNode.id) &&
                !loan.regionVar.points.has(vNode.id)
            ) {
                if (previousNode.is(CoralNode.TypeGuard)) {
                    return previousNode.as(CoralNode.Class).jp;
                }
            }
        }

        return undefined;
    }
}
