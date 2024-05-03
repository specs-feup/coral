import PragmaParseError from "coral/error/pragma/parse/PragmaParseError";
import CoralPragma from "coral/pragma/CoralPragma";

export default class DropPragmaParseError extends PragmaParseError {
    constructor(pragma: CoralPragma, message: string) {
        super(pragma, `Cannot parse drop pragma.`, message);
    }
}
