import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/Access";
import { Joinpoint, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";

export default class MoveBehindReferenceError extends CoralError {
    constructor($invalidUse: Joinpoint, access: Access) {
        super(
            new ErrorMessageBuilder(
                `Cannot move out of '${access.#path.toString()}' which is behind a reference`,
                $invalidUse,
            )
                .code(
                    $invalidUse,
                    `move occurs because '${access.#path.toString()}' has type '${access.#path.ty.name}', which does not have 'Copy' semantics`,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
