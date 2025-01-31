import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/action/Access";
import Path from "@specs-feup/coral/mir/path/Path";
import StructTy from "@specs-feup/coral/mir/symbol/ty/StructTy";

export default class WriteFieldOfPotentiallyDroppedTypeError extends CoralError {
    constructor(pathWithDrop: Path, write: Access, exampleMove: Access) {
        super(
            new ErrorMessageBuilder(
                `Cannot mutate partially uninitialized or moved variable that must be dropped`,
                write.path.jp,
            )
                .code(
                    pathWithDrop.vardecl,
                    `'${pathWithDrop.toString()}' has type '${pathWithDrop.ty.toString()}' with drop function '${(pathWithDrop.ty as StructTy).dropFunction!.name}'`,
                )
                .code(exampleMove.path.jp, "variable might have been moved here")
                .code(write.path.jp, "writing to field of potentially dropped variable")
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
