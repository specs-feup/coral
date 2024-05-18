import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import InstructionNode from "clava-flow/flow/node/instruction/InstructionNode";
import ScopeEndNode from "clava-flow/flow/node/instruction/ScopeEndNode";
import ScopeStartNode from "clava-flow/flow/node/instruction/ScopeStartNode";
import UnknownInstructionNode from "clava-flow/flow/node/instruction/UnknownInstructionNode";
import LivenessNode from "clava-flow/flow/transformation/liveness/LivenessNode";
import BaseGraph from "clava-flow/graph/BaseGraph";
import { GraphTransformation } from "clava-flow/graph/Graph";
import { Vardecl } from "clava-js/api/Joinpoints.js";
import CoralGraph from "coral/graph/CoralGraph";
import CoralNode from "coral/graph/CoralNode";
import DropNode from "coral/graph/DropNode";
import Access from "coral/mir/Access";
import MoveTable from "coral/mir/MoveTable";
import Path from "coral/mir/path/Path";
import PathMemberAccess from "coral/mir/path/PathMemberAccess";
import StructTy from "coral/mir/ty/StructTy";
import Regionck from "coral/regionck/Regionck";

export default class AddDrops implements GraphTransformation {
    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("AddDrops can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        for (const functionEntry of coralGraph.functions) {
            this.#processFunction(functionEntry, coralGraph.getRegionck(functionEntry));
        }
    }

    #processFunction(functionEntry: FunctionEntryNode.Class, regionck: Regionck): void {
        for (const [node, path] of functionEntry.bfs((e) =>
            e.is(ControlFlowEdge.TypeGuard),
        )) {
            if (!node.is(CoralNode.TypeGuard)) {
                continue;
            }

            if (node.is(DropNode.TypeGuard)) {
                continue;
            }

            const coralNode = node.as(CoralNode.Class);

            let moveTable = new MoveTable();

            if (path.length === 0) {
                this.#enterVars(
                    functionEntry.jp.params,
                    moveTable,
                    regionck,
                    MoveTable.State.VALID,
                );
            } else {
                moveTable = MoveTable.merge(
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
            }

            this.#enterVars(coralNode.varsEnteringScope, moveTable, regionck);

            for (const access of coralNode.accesses) {
                const [dropKind, stateHolder] = moveTable.checkDrop(access);

                switch (dropKind) {
                    case MoveTable.DropKind.NO_DROP:
                        break;
                    case MoveTable.DropKind.DROP_AFTER:
                        this.#handleDrop(
                            coralNode,
                            access.path,
                            DropNode.DropInsertLocation.AFTER_TARGET,
                            stateHolder!,
                        );
                        break;
                    case MoveTable.DropKind.DROP_BEFORE:
                        this.#handleDrop(
                            coralNode,
                            access.path,
                            DropNode.DropInsertLocation.BEFORE_TARGET,
                            stateHolder!,
                        );
                        break;
                    default:
                        throw new Error("Unexpected drop kind.");
                }
            }
        }
    }

    #enterVars(
        decls: Vardecl[],
        moveTable: MoveTable,
        regionck: Regionck,
        state: MoveTable.State = MoveTable.State.UNINIT,
    ): void {
        for (const $decl of decls) {
            const ty = regionck.getTy($decl);
            if (ty === undefined) {
                throw new Error("Expected ty to be defined.");
            }
            moveTable.enterVar($decl, ty, state);
        }
    }

    #handleDrop(
        coralNode: CoralNode.Class,
        path: Path,
        dropLocation: DropNode.DropInsertLocation,
        stateHolder: MoveTable.StateHolder,
    ): void {
        if (stateHolder instanceof MoveTable.SingleState) {
            if (!(path.ty instanceof StructTy)) {
                return;
            }
            // TODO handle drop of fields

            if (stateHolder.state === MoveTable.State.VALID) {
                this.#addDrops(coralNode, path, dropLocation, false);
            } else if (
                stateHolder.state === MoveTable.State.MAYBE_MOVED ||
                stateHolder.state === MoveTable.State.MAYBE_UNINIT
            ) {
                this.#addDrops(coralNode, path, dropLocation, true);
            }
        } else if (stateHolder instanceof MoveTable.FieldStates) {
            if (!(path.ty instanceof StructTy)) {
                throw new Error("Expected path to be a struct.");
            }

            for (const field of path.ty.fields.keys()) {
                const subStateHolder = stateHolder.get(field);
                const subPath = new PathMemberAccess(path.$jp, path, field);
                this.#handleDrop(coralNode, subPath, dropLocation, subStateHolder);
            }
        } else {
            throw new Error("Unexpected state holder.");
        }
    }

    #addDrops(
        coralNode: CoralNode.Class,
        path: Path,
        dropLocation: DropNode.DropInsertLocation,
        maybe: boolean,
    ) {
        if (!(path.ty instanceof StructTy)) {
            return;
        }

        if (path.ty.dropFunction !== undefined) {
            this.#addDrop(coralNode, path, dropLocation, maybe);
        } else {
            throw new Error("Trying to handle drop of incomplete type.");
        }
        
        for (const field of path.ty.fields.keys()) {
            const subPath = new PathMemberAccess(path.$jp, path, field);
            this.#addDrops(coralNode, subPath, dropLocation, maybe);
        }
    }

    #addDrop(
        coralNode: CoralNode.Class,
        path: Path,
        dropLocation: DropNode.DropInsertLocation,
        maybe: boolean,
    ) {
        if (this.#isNormalFlow(coralNode)) {
            const nodeAsInstruction = coralNode.graph
                .addNode()
                .init(new UnknownInstructionNode.Builder(coralNode.jp))
                .as(InstructionNode.Class);
            const nodeAsDrop = nodeAsInstruction
                .init(new LivenessNode.Builder())
                .init(new CoralNode.Builder())
                .init(new DropNode.Builder(maybe, dropLocation))
                .as(DropNode.Class);

            nodeAsDrop.accesses.push(
                new Access(path, Access.Mutability.MUTABLE_BORROW, Access.Depth.DEEP),
            );

            coralNode.insertBefore(nodeAsInstruction);
        } else {
            for (const node of coralNode.incomers
                .filter((e) => e.is(ControlFlowEdge.TypeGuard))
                .map((e) => e.source)) {
                if (!node.is(CoralNode.TypeGuard)) {
                    throw new Error("Expected node to be a CoralNode.");
                }
                const nodeAsCoral = node.as(CoralNode.Class);
                this.#addDrop(nodeAsCoral, path, dropLocation, maybe);
            }
        }
    }

    #isNormalFlow(coralNode: CoralNode.Class): boolean {
        if (coralNode.is(ScopeStartNode.TypeGuard)) {
            const scopeNode = coralNode.as(ScopeStartNode.Class);
            if (scopeNode.scopeKind === ScopeStartNode.Kind.BROKEN_FLOW) {
                return false;
            }
        } else if (coralNode.is(ScopeEndNode.TypeGuard)) {
            const scopeNode = coralNode.as(ScopeEndNode.Class);
            if (scopeNode.scopeKind === ScopeEndNode.Kind.BROKEN_FLOW) {
                return false;
            }
        }

        return true;
    }
}
