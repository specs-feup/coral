import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";

export default class PreconditionViolationError extends CoralError {
    constructor($callSite: Joinpoint, argName: string, calleeName: string, expected: string, actual: string) {
        super(
            new ErrorMessageBuilder(
                `Pre-condition violation at call to '${calleeName}'`,
                $callSite,
            )
                .code(
                    $callSite,
                    `argument '${argName}' is ${actual}, but '${calleeName}' requires it to be ${expected}`,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}