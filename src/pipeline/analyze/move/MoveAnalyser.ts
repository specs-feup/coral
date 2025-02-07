import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import { MemberAccess, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import MergeInconsistentStructError from "@specs-feup/coral/error/drop/MergeInconsistentStructError";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import CoralFunctionWiseTransformation, { CoralFunctionWiseTransformationApplier } from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import Path from "@specs-feup/coral/mir/path/Path";
import PathMemberAccess from "@specs-feup/coral/mir/path/PathMemberAccess";
import PathVarRef from "@specs-feup/coral/mir/path/PathVarRef";
import MoveTable from "@specs-feup/coral/symbol/MoveTable";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";

export default class MoveAnalyser extends CoralFunctionWiseTransformation {
    fnApplier = MoveAnalyserApplier;
}

class MoveAnalyserApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        let changed = true;
        while (changed) {
            changed = false;
            // TODO ControlFlow BFS
            for (const { node, path } of this.fn.cfgEntryNode!.bfs(e => e.is(ControlFlowEdge) && !e.as(ControlFlowEdge).isFake)) {
                const coralNode = node.expect(CoralCfgNode, "Nodes were previously inited as CoralCfgNode");

                const previousMoveTable = coralNode.moveTable;

                if (path.length === 0) {
                    this.#enterVars(
                        this.fn.jp.params,
                        coralNode.moveTable,
                        MoveTable.State.VALID,
                    );
                } else {
                    try {
                        coralNode.moveTable = MoveTable.merge(
                            node.incomers
                                .filterIs(ControlFlowEdge)
                                .sources
                                .expectAll(CoralCfgNode, "Nodes were previously inited as CoralCfgNode")
                                .toArray()
                                .map(n => n.moveTable),
                        );
                    } catch (e) {
                        if (!(e instanceof MergeInconsistentStructError.Stub)) {
                            throw e;
                        }

                        let path: Path = new PathVarRef(
                            e.vardecl!,
                            this.fn.getSymbol(e.vardecl!),
                        );
                        let fields = [];
                        let holder: MoveTable.StateHolder | undefined = e.holder;
                        while (holder !== undefined) {
                            if (holder.field !== undefined) {
                                fields.push(holder.field);
                            }
                            holder = holder.parent;
                        }
                        fields = fields.reverse();
                        for (const field of fields) {
                            path = new PathMemberAccess(
                                path.jp as MemberAccess,
                                path,
                                field,
                            );
                        }

                        throw new MergeInconsistentStructError(coralNode.jp, path);
                    }
                }

                this.#enterVars(
                    coralNode.varsEnteringScope,
                    coralNode.moveTable,
                );

                for (const access of coralNode.accesses) {
                    coralNode.moveTable.updateAccess(access);
                }

                if (!coralNode.moveTable.equals(previousMoveTable)) {
                    changed = true;
                }
            }
        }
    }

    #enterVars(
        decls: Vardecl[],
        moveTable: MoveTable,
        state: MoveTable.State = MoveTable.State.UNINIT,
    ): void {
        for (const $decl of decls) {
            moveTable.enterVar($decl, this.fn.getSymbol($decl), state);
        }
    }
}
