import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/Access";
import {
    FunctionJp,
    Joinpoint,
    Type,
    Vardecl,
} from "@specs-feup/clava/api/Joinpoints.js";
import Path from "@specs-feup/coral/mir/path/Path";

export default class DropInconsistentStructError extends CoralError {
    constructor($dropLocation: Joinpoint, path: Path, $dropFunction: FunctionJp) {
        super(
            new ErrorMessageBuilder(
                `Cannot drop partially uninitialized or moved variable`,
                $dropLocation,
            )
                .code(
                    path.vardecl,
                    `'${path.toString()}' has type '${path.#ty.name}' with drop function '${$dropFunction.name}'`,
                )
                .codeString(
                    $dropLocation.originNode.code.trim().split("\n").reverse()[0],
                    `'${path.toString()}' would be dropped here, but it is partially uninitialized or moved`,
                    $dropLocation.originNode.endLine,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
