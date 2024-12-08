import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/Access";
import {
    FunctionJp,
    Joinpoint,
    RecordJp,
    Vardecl,
} from "@specs-feup/clava/api/Joinpoints.js";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";
import LifetimeAssignmentPragma from "@specs-feup/coral/pragma/lifetime/LifetimeAssignmentPragma";

export default class LifetimeReassignmentError extends CoralError {
    constructor(
        lfFirstAssign: LifetimeAssignmentPragma,
        lfSecondAssign: LifetimeAssignmentPragma,
    ) {
        const $struct = lfFirstAssign.pragma.$jp.target.parent;

        const startLine = $struct.originNode.line;
        let firstAssignLine = lfFirstAssign.pragma.$jp.parent.line;
        let secondAssignLine = lfSecondAssign.pragma.$jp.parent.line;
        if (firstAssignLine > secondAssignLine) {
            [lfFirstAssign, lfSecondAssign] = [lfSecondAssign, lfFirstAssign];
            [firstAssignLine, secondAssignLine] = [secondAssignLine, firstAssignLine];
        }
        const endLine = $struct.originNode.endLine;

        const builder = new ErrorMessageBuilder(
            "Lifetimes cannot be reassigned.",
            lfSecondAssign.pragma.$jp.parent,
        );

        builder.codeString(
            $struct.originNode.code.trim().split("\n")[0],
            undefined,
            startLine,
        );
        if (startLine + 1 < firstAssignLine) {
            builder.ellipsis();
        }
        builder
            .code(lfFirstAssign.pragma.$jp.parent, `Lifetime first assigned here`)
            .code(lfSecondAssign.pragma.$jp.parent, `Lifetime reassigned here`)
            .code(lfFirstAssign.pragma.$jp.target);

        if (secondAssignLine + 1 < endLine) {
            builder.ellipsis();
        }
        builder.codeString("}", undefined, endLine);

        super(builder.toString());
        this.name = this.constructor.name;
    }
}
