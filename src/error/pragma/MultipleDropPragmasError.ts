import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";

export default class MultipleDropPragmasError extends CoralError {
    constructor(firstPragma: CoralPragma, secondPragma: CoralPragma) {
        super(
            new ErrorMessageBuilder(
                "Multiple drop pragmas found for the same struct.",
                secondPragma.$jp.parent,
            )
                .code(firstPragma.$jp.parent, "A drop function is first assigned here.")
                .code(secondPragma.$jp.parent, "Drop function is reassigned here.")
                .code(secondPragma.$jp.target)
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
