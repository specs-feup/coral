import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import { Field, FunctionJp, Joinpoint, RecordJp, Vardecl } from "clava-js/api/Joinpoints.js";
import CoralPragma from "coral/pragma/CoralPragma";
import LifetimeAssignmentPragma from "coral/pragma/lifetime/LifetimeAssignmentPragma";

export default class LifetimeExpectedError extends CoralError {
    constructor(
        $field: Field,
    ) {
        const $struct = $field.parent;

        const startLine = $struct.originNode.line;
        const fieldLine = $field.originNode.line;
        const endLine = $struct.originNode.endLine;

        const builder = new ErrorMessageBuilder(
            "Expected lifetime.",
            $field,
        );

        builder.codeString($struct.originNode.code.trim().split("\n")[0], undefined, startLine);
        if (startLine + 1 < fieldLine) {
            builder.ellipsis();
        }
        builder
            .code($field, `'${$field.name}' is missing a lifetime annotation`)

        if (fieldLine + 1 < endLine) {
            builder.ellipsis();
        }
        builder.codeString("}", undefined, endLine);

        super(builder.toString());
        this.name = this.constructor.name;
    }
}
