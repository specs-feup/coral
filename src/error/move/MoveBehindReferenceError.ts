import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import { Joinpoint, Vardecl } from "clava-js/api/Joinpoints.js";

export default class MoveBehindReferenceError extends CoralError {
    constructor(
        $invalidUse: Joinpoint,
        access: Access,
    ) {
        super(
            new ErrorMessageBuilder(
                `Cannot move out of '${access.path.toString()}' which is behind a reference`,
                $invalidUse,
            )
                .code(
                    $invalidUse,
                    `move occurs because '${access.path.toString()}' has type '${access.path.ty.name}', which does not have 'Copy' semantics`,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
