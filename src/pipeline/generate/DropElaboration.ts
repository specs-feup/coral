import ClavaJoinPoints from "@specs-feup/clava/api/clava/ClavaJoinPoints.js";
import { Joinpoint, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralFunctionWiseTransformation, { CoralFunctionWiseTransformationApplier } from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import DropNode from "@specs-feup/coral/graph/DropNode";
import Access from "@specs-feup/coral/mir/action/Access";
import Path from "@specs-feup/coral/mir/path/Path";
import PathMemberAccess from "@specs-feup/coral/mir/path/PathMemberAccess";
import PathVarRef from "@specs-feup/coral/mir/path/PathVarRef";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import StructTy from "@specs-feup/coral/mir/symbol/ty/StructTy";
import Query from "@specs-feup/lara/api/weaver/Query.js";


class DropElaboration extends CoralFunctionWiseTransformation {
    fnApplier = DropElaborationApplier;
}

class DropElaborationApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {

    // #dropFlags: Map<string, DropElaboration.DropFlagHolder>;
    // tempVarCounter: number;
    // #varNamePrefix: string;

    // constructor(
    //     tempVarCounter: number = 0,
    //     varNamePrefix: string = "__coral_drop_flag_",
    // ) {
    //     this.tempVarCounter = tempVarCounter;
    //     this.#varNamePrefix = varNamePrefix;
    //     this.#dropFlags = new Map();
    // }

        for (const node of this.fn.controlFlowNodes.filterIs(DropNode)) {
            const path = node.accesses[0].path;
            if (!(path.ty instanceof StructTy && path.ty.dropFunction !== undefined)) {
                throw new Error("Only structs with drop functions can be dropped");
            }
            const $dropFn = path.ty.dropFunction;

            // const $dropCall = ClavaJoinPoints.exprStmt(ClavaJoinPoints.call($dropFn, ClavaJoinPoints.unaryOp("&", path.$jp)));
            let $dropCall = `${$dropFn.name}(&${path.toString()});`;

            if (node.isDropConditional) {
                const $dropFlag = ClavaJoinPoints.varRef(
                    this.#getDropFlag(path, this.fn),
                );
                $dropCall = `if (${$dropFlag.code}) {${$dropCall}}`;
            }

            switch (node.dropInsertLocation) {
                case DropNode.InsertLocation.BEFORE_TARGET:
                    node.insertDropCallBefore($dropCall);
                    break;
                case DropNode.InsertLocation.AFTER_TARGET:
                    node.insertDropCallAfter($dropCall);
                    break;
                default:
                    throw new Error("Invalid drop insert location");
            }
        }
    }

    #getDropFlag(path: Path, functionEntry: CoralFunctionNode.Class): Vardecl {
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
            const holder = this.#dropFlags.get(path.vardecl.astId);
            if (holder !== undefined) {
                return holder;
            }

            const newHolder = DropElaboration.DropFlagHolder.create(path.ty);
            this.#dropFlags.set(path.vardecl.astId, newHolder);
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

    #createDropFlag(path: Path, functionEntry: CoralFunctionNode.Class): Vardecl {
        const dropFlagName = this.#getTempVarName();

        const $dropFlagDecl = ClavaJoinPoints.varDecl(
            dropFlagName,
            ClavaJoinPoints.integerLiteral(path.vardecl.hasInit ? "1" : "0"),
        );

        // TODO doesn't this have problems with shadowing?
        for (const $vardecl of Query.searchFrom(functionEntry.jp, Vardecl, {
            name: path.vardecl.name,
        })) {
            $vardecl.insertAfter($dropFlagDecl);
        }

        for (const node of functionEntry.controlFlowNodes.filterIs(CoralCfgNode)) {
            for (const access of node.accesses) {
                if (access.kind === Access.Kind.WRITE) {
                    if (path.contains(access.path) || access.path.contains(path)) {
                        this.#addFlagAssignment(node.jp, $dropFlagDecl, true);
                    }
                } else if (access.kind === Access.Kind.READ) {
                    if (path.contains(access.path)) {
                        this.#addFlagAssignment(node.jp, $dropFlagDecl, false);
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

                    dropFlags.set(field, DropFlagHolder.create(fieldTy));
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
