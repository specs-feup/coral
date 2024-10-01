import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import BaseGraph from "clava-flow/graph/BaseGraph";
import { GraphTransformation } from "clava-flow/graph/Graph";
import { Joinpoint, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import ClavaJoinPoints from "@specs-feup/clava/api/clava/ClavaJoinPoints.js";
import CoralGraph from "coral/graph/CoralGraph";
import CoralNode from "coral/graph/CoralNode";
import DropNode from "coral/graph/DropNode";
import Access from "coral/mir/Access";
import Path from "coral/mir/path/Path";
import PathMemberAccess from "coral/mir/path/PathMemberAccess";
import PathVarRef from "coral/mir/path/PathVarRef";
import StructTy from "coral/mir/ty/StructTy";
import Ty from "coral/mir/ty/Ty";
import Query from "@specs-feup/lara/api/weaver/Query.js";

class DropElaboration implements GraphTransformation {
    #dropFlags: Map<string, DropElaboration.DropFlagHolder>;
    tempVarCounter: number;
    #varNamePrefix: string;

    constructor(
        tempVarCounter: number = 0,
        varNamePrefix: string = "__coral_drop_flag_",
    ) {
        this.tempVarCounter = tempVarCounter;
        this.#varNamePrefix = varNamePrefix;
        this.#dropFlags = new Map();
    }

    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("DropElaboration can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        for (const functionEntry of coralGraph.functions) {
            this.#processFunction(functionEntry);
        }
    }

    #processFunction(functionEntry: FunctionEntryNode.Class): void {
        for (const [node] of functionEntry.bfs((e) => e.is(ControlFlowEdge.TypeGuard))) {
            if (!node.is(DropNode.TypeGuard)) {
                continue;
            }

            const dropNode = node.as(DropNode.Class);

            const path = dropNode.accesses[0].path;
            if (!(path.ty instanceof StructTy && path.ty.dropFunction !== undefined)) {
                throw new Error("Only structs with drop functions can be dropped");
            }
            const $dropFn = path.ty.dropFunction;

            // const $dropCall = ClavaJoinPoints.exprStmt(ClavaJoinPoints.call($dropFn, ClavaJoinPoints.unaryOp("&", path.$jp)));
            let $dropCall = `${$dropFn.name}(&${path.toString()});`;

            if (dropNode.dropIsConditional) {
                const $dropFlag = ClavaJoinPoints.varRef(this.#getDropFlag(path, functionEntry));
                $dropCall = `if (${$dropFlag.code}) {${$dropCall}}`;
            }

            switch (dropNode.dropInsertLocation) {
                case DropNode.DropInsertLocation.BEFORE_TARGET:
                    dropNode.insertDropCallBefore($dropCall);
                    break;
                case DropNode.DropInsertLocation.AFTER_TARGET:
                    dropNode.insertDropCallAfter($dropCall);
                    break;
                default:
                    throw new Error("Invalid drop insert location");
            }
        }
    }

    #getDropFlag(path: Path, functionEntry: FunctionEntryNode.Class): Vardecl {
        const holder = this.#pathToDropFlagHolder(path);

        if (holder instanceof DropElaboration.SingleDropFlagHolder) {
            if (holder.dropFlag === undefined) {
                holder.dropFlag = this.#createDropFlag(path, functionEntry);
            }

            return holder.dropFlag;
        } else {
            throw new Error(
                "PathVarRef in the drop should not point to a FieldDropFlags",
            );
        }
    }

    #pathToDropFlagHolder(path: Path): DropElaboration.DropFlagHolder {
        if (path instanceof PathVarRef) {
            const holder = this.#dropFlags.get(path.$vardecl.astId);
            if (holder !== undefined) {
                return holder;
            }

            const newHolder = DropElaboration.DropFlagHolder.create(path.ty);
            this.#dropFlags.set(path.$vardecl.astId, newHolder);
            return newHolder;
        } else if (path instanceof PathMemberAccess) {
            const inner = this.#pathToDropFlagHolder(path.inner);
            if (inner instanceof DropElaboration.FieldDropFlags) {
                return inner.get(path.fieldName);
            } else {
                return inner;
            }
        } else {
            throw new Error("Unsupported path type");
        }
    }

    #getTempVarName() {
        return `${this.#varNamePrefix}${this.tempVarCounter++}`;
    }

    #createDropFlag(path: Path, functionEntry: FunctionEntryNode.Class): Vardecl {
        const dropFlagName = this.#getTempVarName();

        const $dropFlagDecl = ClavaJoinPoints.varDecl(
            dropFlagName,
            ClavaJoinPoints.integerLiteral(path.innerVardecl.hasInit ? "1" : "0"),
        );

        for (const $jp of Query.searchFrom(functionEntry.jp, "vardecl", { name: path.innerVardecl.name })) {
            const $vardecl = $jp as Vardecl;
            $vardecl.insertAfter($dropFlagDecl);
        }

        for (const [node] of functionEntry.bfs((e) => e.is(ControlFlowEdge.TypeGuard))) {
            if (!node.is(CoralNode.TypeGuard)) {
                continue;
            }

            const nodeAsCoralNode = node.as(CoralNode.Class);

            for (const access of nodeAsCoralNode.accesses) {
                if (access.mutability === Access.Mutability.WRITE) {
                    if (path.contains(access.path) || access.path.contains(path)) {
                        this.#addFlagAssignment(nodeAsCoralNode.jp, $dropFlagDecl, true);
                    }
                } else if (access.mutability === Access.Mutability.READ) {
                    if (path.contains(access.path)) {
                        this.#addFlagAssignment(nodeAsCoralNode.jp, $dropFlagDecl, false);
                    }
                }
            }
        }

        return $dropFlagDecl;
    }

    #addFlagAssignment($jp: Joinpoint, $dropFlag: Vardecl, value: boolean) {
        $jp.insertAfter(
            ClavaJoinPoints.exprStmt(
                ClavaJoinPoints.binaryOp(
                    "=",
                    ClavaJoinPoints.varRef($dropFlag),
                    ClavaJoinPoints.integerLiteral(value ? 1 : 0),
                ),
            ),
        );
    }
}

namespace DropElaboration {
    export abstract class DropFlagHolder {
        static create(ty: Ty): DropFlagHolder {
            if (!(ty instanceof StructTy)) {
                throw new Error("Expected struct type");
            }

            if (ty.dropFunction === undefined) {
                const dropFlags = new Map<string, DropFlagHolder>();
                for (const [field, fieldTy] of ty.fields.entries()) {
                    if (!(fieldTy instanceof StructTy)) {
                        continue;
                    }

                    dropFlags.set(
                        field,
                        DropFlagHolder.create(fieldTy),
                    );
                }
                return new FieldDropFlags(dropFlags);
            } else {
                return new SingleDropFlagHolder();
            }
        }
    }

    export class SingleDropFlagHolder extends DropFlagHolder {
        dropFlag?: Vardecl;
    }

    export class FieldDropFlags extends DropFlagHolder {
        #dropFlags: Map<string, DropFlagHolder>;

        constructor(dropFlags: Map<string, DropFlagHolder>) {
            super();
            this.#dropFlags = dropFlags;
        }

        get(field: string): DropFlagHolder {
            const state = this.#dropFlags.get(field);
            if (state === undefined) {
                throw new Error(`Field ${field} not found`);
            }
            return state;
        }
    }
}

export default DropElaboration;
