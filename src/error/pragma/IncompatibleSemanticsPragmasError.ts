import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";

export default class IncompatibleSemanticsPragmasError extends CoralError {
    constructor(copyFlag: CoralPragma, moveFlag: CoralPragma) {
        let firstPragma: CoralPragma;
        let secondPragma: CoralPragma;
        if (copyFlag.$jp.line < moveFlag.$jp.line) {
            firstPragma = copyFlag;
            secondPragma = moveFlag;
        } else {
            firstPragma = moveFlag;
            secondPragma = copyFlag;
        }

        super(
            new ErrorMessageBuilder(
                "Struct cannot have 'copy' and 'move' semantics simultaneously.",
                moveFlag.$jp.parent,
            )
                .code(
                    firstPragma.$jp.parent,
                    `'${firstPragma.name}' semantics defined here`,
                )
                .code(
                    secondPragma.$jp.parent,
                    `'${secondPragma.name}' semantics defined here`,
                )
                .code(secondPragma.$jp.target)
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
