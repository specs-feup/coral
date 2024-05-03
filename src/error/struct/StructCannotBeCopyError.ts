import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import { Field, FunctionJp, Joinpoint, RecordJp, Vardecl } from "clava-js/api/Joinpoints.js";
import CoralPragma from "coral/pragma/CoralPragma";

export default class StructCannotBeCopyError extends CoralError {
    constructor(copyFlag: CoralPragma, dropFnPragma?: CoralPragma, $moveFieldExample?: Field) {
        const builder = new ErrorMessageBuilder(
            "Struct cannot be marked as copy.",
            copyFlag.$jp.parent,
        );

        if (dropFnPragma !== undefined && dropFnPragma.$jp.line < copyFlag.$jp.line) {
            builder
                .code(dropFnPragma.$jp.parent, "drop function is assigned here, making the struct non-copyable")
                .code(copyFlag.$jp.parent, `struct is marked as 'copy' here`);
        } else if (dropFnPragma !== undefined) {
            builder
                .code(copyFlag.$jp.parent, `struct is marked as 'copy' here`)
                .code(dropFnPragma.$jp.parent, "drop function is assigned here, making the struct non-copyable");
        } else {
            builder.code(copyFlag.$jp.parent, `struct is marked as 'copy' here`);
        }

        if ($moveFieldExample !== undefined && dropFnPragma === undefined) {
            const startLine = copyFlag.$jp.target.line;
            const fieldLine = $moveFieldExample.line;
            const endLine = copyFlag.$jp.target.endLine;

            builder.codeString(copyFlag.$jp.target.code.trim().split("\n")[0], undefined, startLine);
            if (startLine + 1 < fieldLine) {
                builder.ellipsis()
            }
            builder.code($moveFieldExample, `field '${$moveFieldExample.name}' has type '${$moveFieldExample.type.code}', which has move semantics`)
            if (fieldLine + 1 < endLine) {
                builder.ellipsis()
            }
            builder.codeString("}", undefined, endLine);
        } else {
            builder.code(copyFlag.$jp.target);
        }
        
        super(builder.toString());
        this.name = this.constructor.name;
    }
}
