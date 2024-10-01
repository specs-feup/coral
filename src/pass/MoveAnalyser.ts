import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import BaseGraph from "clava-flow/graph/BaseGraph";
import { GraphTransformation } from "clava-flow/graph/Graph";
import { MemberAccess, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import MergeInconsistentStructError from "coral/error/drop/MergeInconsistentStructError";
import CoralGraph from "coral/graph/CoralGraph";
import CoralNode from "coral/graph/CoralNode";
import MoveTable from "coral/mir/MoveTable";
import Path from "coral/mir/path/Path";
import PathMemberAccess from "coral/mir/path/PathMemberAccess";
import PathVarRef from "coral/mir/path/PathVarRef";
import Regionck from "coral/regionck/Regionck";

export default class MoveAnalyser implements GraphTransformation {
    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("MoveAnalyser can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        

        for (const functionEntry of coralGraph.functions) {
            this.#processFunction(functionEntry, coralGraph.getRegionck(functionEntry));
        }
    }

    #processFunction(functionEntry: FunctionEntryNode.Class, regionck: Regionck): void {
        let changed = true;
        while (changed) {
            changed = false;
            for (const [node, path] of functionEntry.bfs((e) =>
                e.is(ControlFlowEdge.TypeGuard),
            )) {
                if (!node.is(CoralNode.TypeGuard)) {
                    continue;
                }

                const coralNode = node.as(CoralNode.Class);

                const previousMoveTable = coralNode.moveTable;

                if (path.length === 0) {
                    this.#enterVars(
                        functionEntry.jp.params,
                        coralNode.moveTable,
                        regionck,
                        MoveTable.State.VALID,
                    );
                } else {
                    try {
                        coralNode.moveTable = MoveTable.merge(
                            node.incomers
                                .filter((e) => e.is(ControlFlowEdge.TypeGuard))
                                .map((e) => e.source)
                                .map((n) => {
                                    if (!n.is(CoralNode.TypeGuard)) {
                                        throw new Error("Expected node to be a CoralNode.");
                                    }
                                    return n.as(CoralNode.Class).moveTable;
                                }),
                        );
                    } catch (e) {
                        if (!(e instanceof MergeInconsistentStructError.Stub)) {
                            throw e;
                        }

                        let path: Path = new PathVarRef(e.vardecl!, regionck.getTy(e.vardecl!)!);
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
                            path = new PathMemberAccess(path.$jp as MemberAccess, path, field);
                        }
                        
                        throw new MergeInconsistentStructError(coralNode.jp, path);
                    }
                }
                
                this.#enterVars(coralNode.varsEnteringScope, coralNode.moveTable, regionck);

                for (const access of coralNode.accesses) {
                    coralNode.moveTable.updateAccess(access);
                }

                if (!coralNode.moveTable.equals(previousMoveTable)) {
                    changed = true;
                }
            }
        }
    }

    #enterVars(decls: Vardecl[], moveTable: MoveTable, regionck: Regionck, state: MoveTable.State = MoveTable.State.UNINIT): void {
        for (const $decl of decls) {
            const ty = regionck.getTy($decl);
            if (ty === undefined) {
                throw new Error("Expected ty to be defined.");
            }
            moveTable.enterVar($decl, ty, state);
        }
    }
}
