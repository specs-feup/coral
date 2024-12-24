import ScopeNode from "@specs-feup/clava-flow/cfg/node/ScopeNode";
import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import { MemberAccess, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import DropInconsistentStructError from "@specs-feup/coral/error/drop/DropInconsistentStructError";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import CoralFunctionWiseTransformation, { CoralFunctionWiseTransformationApplier } from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import DropNode from "@specs-feup/coral/graph/DropNode";
import Access from "@specs-feup/coral/mir/action/Access";
import Path from "@specs-feup/coral/mir/path/Path";
import PathMemberAccess from "@specs-feup/coral/mir/path/PathMemberAccess";
import StructTy from "@specs-feup/coral/mir/symbol/ty/StructTy";
import MoveTable from "@specs-feup/coral/symbol/MoveTable";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";
import ControlFlowNode from "@specs-feup/flow/flow/ControlFlowNode";

export default class AddDrops extends CoralFunctionWiseTransformation {
    fnApplier = AddDropsApplier;
}

class AddDropsApplier extends CoralFunctionWiseTransformationApplier {    
    // TODO this is too similar to move analyser
    apply(): void {
        const dropsToHandle: [
            CoralCfgNode.Class,
            Path,
            DropNode.InsertLocation,
            MoveTable.StateHolder,
        ][] = [];

        // TODO ControlFlow BFS
        for (const { node, path } of this.fn.cfgEntryNode!.bfs(e => e.is(ControlFlowEdge))) {
            const coralNode = node.expect(CoralCfgNode, "Nodes were previously inited as CoralCfgNode");

            let moveTable = new MoveTable();

            if (path.length === 0) {
                this.#enterVars(
                    this.fn.jp.params,
                    moveTable,
                    MoveTable.State.VALID,
                );
            } else {
                moveTable = MoveTable.merge(
                    node.incomers
                        .filterIs(ControlFlowEdge)
                        .sources
                        .expectAll(CoralCfgNode, "Nodes were previously inited as CoralCfgNode")
                        .toArray()
                        .map(n => n.moveTable),
                );
            }

            this.#enterVars(coralNode.varsEnteringScope, moveTable);

            for (const access of coralNode.accesses) {
                const [dropKind, stateHolder] = moveTable.checkDrop(access);

                switch (dropKind) {
                    case MoveTable.DropKind.NO_DROP:
                        break;
                    case MoveTable.DropKind.DROP_AFTER:
                        dropsToHandle.push([
                            coralNode,
                            access.path,
                            DropNode.InsertLocation.AFTER_TARGET,
                            stateHolder!,
                        ]);
                        break;
                    case MoveTable.DropKind.DROP_BEFORE:
                        dropsToHandle.push([
                            coralNode,
                            access.path,
                            DropNode.InsertLocation.BEFORE_TARGET,
                            stateHolder!,
                        ]);
                        break;
                    default:
                        throw new Error("Unexpected drop kind.");
                }
            }
        }

        for (const [coralNode, path, dropLocation, stateHolder] of dropsToHandle) {
            this.#handleDrop(coralNode, path, dropLocation, stateHolder);
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

    #handleDrop(
        node: CoralCfgNode.Class,
        path: Path,
        dropLocation: DropNode.InsertLocation,
        stateHolder: MoveTable.StateHolder,
    ): void {
        if (stateHolder instanceof MoveTable.SingleState) {
            if (!(path.ty instanceof StructTy)) {
                return;
            }

            if (stateHolder.state === MoveTable.State.VALID) {
                this.#addDrops(node, path, dropLocation, false);
            } else if (
                stateHolder.state === MoveTable.State.MAYBE_MOVED ||
                stateHolder.state === MoveTable.State.MAYBE_UNINIT
            ) {
                this.#addDrops(node, path, dropLocation, true);
            }
        } else if (stateHolder instanceof MoveTable.FieldStates) {
            if (!(path.ty instanceof StructTy)) {
                throw new Error("Expected path to be a struct.");
            }

            if (path.ty.dropFunction !== undefined) {
                if (!stateHolder.isConsistentState()) {
                    throw new DropInconsistentStructError(
                        node.jp,
                        path,
                        path.ty.dropFunction,
                    );
                }

                if (stateHolder.dropState === MoveTable.State.VALID) {
                    this.#addDrops(node, path, dropLocation, false);
                } else if (
                    stateHolder.dropState === MoveTable.State.MAYBE_MOVED ||
                    stateHolder.dropState === MoveTable.State.MAYBE_UNINIT
                ) {
                    this.#addDrops(node, path, dropLocation, true);
                }
            } else {
                for (const field of path.ty.fields.keys()) {
                    const subStateHolder = stateHolder.get(field);
                    const $subPathJp = path.jp as MemberAccess; //TODO// ClavaJoinPoints.memberAccess(path.$jp, field);
                    const subPath = new PathMemberAccess($subPathJp, path, field);
                    this.#handleDrop(node, subPath, dropLocation, subStateHolder);
                }
            }
        } else {
            throw new Error("Unexpected state holder.");
        }
    }

    #addDrops(
        node: CoralCfgNode.Class,
        path: Path,
        dropLocation: DropNode.InsertLocation,
        maybe: boolean,
    ) {
        if (!(path.ty instanceof StructTy)) {
            return;
        }

        if (dropLocation === DropNode.InsertLocation.AFTER_TARGET) {
            this.#addDropFields(
                Array.from(path.ty.fields.keys()).reverse(),
                node,
                path,
                dropLocation,
                maybe,
            );
        }

        if (path.ty.dropFunction !== undefined) {
            this.#addDrop(node, path, dropLocation, maybe);
        }

        if (dropLocation === DropNode.InsertLocation.BEFORE_TARGET) {
            this.#addDropFields(
                Array.from(path.ty.fields.keys()),
                node,
                path,
                dropLocation,
                maybe,
            );
        }
    }

    #addDropFields(
        fields: string[],
        node: CoralCfgNode.Class,
        path: Path,
        dropLocation: DropNode.InsertLocation,
        maybe: boolean,
    ) {
        for (const field of fields) {
            const $subPathJp = path.jp as MemberAccess; //TODO// ClavaJoinPoints.memberAccess(path.$jp, field);
            const subPath = new PathMemberAccess($subPathJp, path, field);
            this.#addDrops(node, subPath, dropLocation, maybe);
        }
    }

    #addDrop(
        node: CoralCfgNode.Class,
        path: Path,
        dropLocation: DropNode.InsertLocation,
        maybe: boolean,
    ) {
        if (!node.is(ScopeNode) || node.as(ScopeNode).isFlowNormal) {
            const dropNode = this.graph
                .addNode()
                .init(new ControlFlowNode.Builder(this.fn))
                .init(new ClavaControlFlowNode.Builder(node.jp))
                .init(new CoralCfgNode.Builder())
                .init(new DropNode.Builder(maybe, dropLocation))
                .as(DropNode);

            dropNode.addAccess(path, Access.Kind.MUTABLE_BORROW);

            switch (dropLocation) {
                case DropNode.InsertLocation.BEFORE_TARGET:
                    node.insertBefore(dropNode);
                    break;
                case DropNode.InsertLocation.AFTER_TARGET:
                    node.insertAfter(dropNode);
                    break;
                default:
                    throw new Error("Unexpected drop location.");
            }
        } else {
            const previousNodes = node.incomers.filterIs(ControlFlowEdge).sources.filterIs(CoralCfgNode);
            for (const previousNode of previousNodes) {
                this.#addDrop(previousNode, path, dropLocation, maybe);
            }
        }
    }
}
