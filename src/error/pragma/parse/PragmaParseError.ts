import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import CoralPragma from "coral/pragma/CoralPragma";

export default class PragmaParseError extends CoralError {
    constructor(pragma: CoralPragma, topMessage: string, hint: string) {
        super(
            new ErrorMessageBuilder(topMessage, pragma.$jp.parent)
                .code(pragma.$jp.parent, hint)
                .code(pragma.$jp.target)
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
