import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import { Joinpoint, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import Path from "@specs-feup/coral/mir/path/Path";
import StructTy from "@specs-feup/coral/mir/ty/StructTy";
import MoveTable from "@specs-feup/coral/mir/MoveTable";

class MergeInconsistentStructError extends CoralError {
    constructor($mergeLocation: Joinpoint, path: Path) {
        super(
            new ErrorMessageBuilder(
                `Cannot merge flow of partially uninitialized or moved variable that must be dropped`,
                $mergeLocation,
            )
                .code(
                    path.vardecl,
                    `'${path.toString()}' has type '${path.#ty.name}' with drop function '${(path.#ty as StructTy).dropFunction!.name}'`,
                )
                .codeString(
                    $mergeLocation.originNode.code.trim().split("\n").reverse()[0],
                    `this statement can be reached non-sequentially, but '${path.toString()}' might be partially uninitialized or moved`,
                    $mergeLocation.originNode.endLine,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}

namespace MergeInconsistentStructError {
    export class Stub extends Error {
        holder: MoveTable.StateHolder;
        vardecl?: Vardecl;

        constructor(holder: MoveTable.StateHolder) {
            super();
            this.holder = holder;
        }
    }
}

export default MergeInconsistentStructError;
