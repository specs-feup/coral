import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import { FunctionJp, Joinpoint } from "clava-js/api/Joinpoints.js";
import Path from "coral/mir/path/Path";
import Access from "coral/mir/Access";
import StructTy from "coral/mir/ty/StructTy";

export default class WriteFieldOfPotentiallyDroppedTypeError extends CoralError {
    constructor(pathWithDrop: Path, write: Access, exampleMove: Access) {
        super(
            new ErrorMessageBuilder(
                `Cannot mutate partially uninitialized or moved variable that must be dropped`,
                write.path.$jp,
            )
                .code(
                    pathWithDrop.innerVardecl,
                    `'${pathWithDrop.toString()}' has type '${pathWithDrop.ty.name}' with drop function '${(pathWithDrop.ty as StructTy).dropFunction!.name}'`,
                )
                .code(exampleMove.path.$jp, "variable might have been moved here")
                .code(write.path.$jp, "writing to field of potentially dropped variable")
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
