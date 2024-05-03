import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import { FunctionJp, Joinpoint, RecordJp, Vardecl } from "clava-js/api/Joinpoints.js";
import CoralPragma from "coral/pragma/CoralPragma";
import LifetimeAssignmentPragma from "coral/pragma/lifetime/LifetimeAssignmentPragma";

export default class UnexpectedLifetimeAssignmentError extends CoralError {
    constructor(
        lfAssign: LifetimeAssignmentPragma,
    ) {
        const $struct = lfAssign.pragma.$jp.target.parent;

        const startLine = $struct.line;
        const fieldLine = lfAssign.pragma.$jp.parent.line;
        const endLine = $struct.endLine;

        

        const builder = new ErrorMessageBuilder(
            "Lifetime assignment is invalid.",
            lfAssign.pragma.$jp.parent,
        );

        builder.codeString($struct.code.trim().split("\n")[0], undefined, startLine);
        if (startLine + 1 < fieldLine) {
            builder.ellipsis();
        }
        builder
            .code(lfAssign.pragma.$jp.parent, `Unexpected lifetime assignment to '${lfAssign.lhs.toString()}'`)
            .code(lfAssign.pragma.$jp.target, `'${lfAssign.lhs.toString()}' does not require a lifetime here`);

        if (fieldLine + 1 < endLine) {
            builder.ellipsis();
        }
        builder.codeString("}", undefined, endLine);

        super(builder.toString());
        this.name = this.constructor.name;
    }
}
