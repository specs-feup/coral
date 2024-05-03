import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import { Joinpoint, Vardecl } from "clava-js/api/Joinpoints.js";
import CoralPragma from "coral/pragma/CoralPragma";

export default class MultipleDropPragmasError extends CoralError {
    constructor(firstPragma: CoralPragma, secondPragma: CoralPragma) {
        super(
            new ErrorMessageBuilder("Multiple drop pragmas found for the same struct.", secondPragma.$jp.parent)
                .code(firstPragma.$jp.parent, "A drop function is first assigned here.")
                .code(secondPragma.$jp.parent, "Drop function is reassigned here.")
                .code(secondPragma.$jp.target)
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
