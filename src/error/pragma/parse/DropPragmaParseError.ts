import PragmaParseError from "@specs-feup/coral/error/pragma/parse/PragmaParseError";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";

export default class DropPragmaParseError extends PragmaParseError {
    constructor(pragma: CoralPragma, message: string) {
        super(pragma, `Cannot parse drop pragma.`, message);
    }
}
