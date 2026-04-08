import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";

export default class ContractViolationError extends CoralError {
    constructor($jp: Joinpoint, varName: string, expected: string, actual: string) {
        super(
            new ErrorMessageBuilder(
                `Contract violation for parameter '${varName}'`,
                $jp,
            )
                .code(
                    $jp,
                    `promised to be ${expected} on exit, but is actually ${actual}`,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
