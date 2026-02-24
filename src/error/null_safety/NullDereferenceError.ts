import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";

export default class NullDereferenceError extends CoralError {
    constructor($invalidUse: Joinpoint, varName: string) {
        super(
            new ErrorMessageBuilder(
                `Dereference of a null pointer '${varName}'`,
                $invalidUse,
            )
                .code(
                    $invalidUse,
                    `pointer '${varName}' is definitely null here`,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
