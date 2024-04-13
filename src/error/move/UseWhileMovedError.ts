import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import { Joinpoint, Vardecl } from "clava-js/api/Joinpoints.js";

export default class UseWhileMovedError extends CoralError {
    constructor($invalidUse: Joinpoint, $declaration: Vardecl, access: Access, $move: Joinpoint) {
        super(
            new ErrorMessageBuilder(
                `Use of moved value '${access.path.toString()}'`,
                $invalidUse,
            )
                .code(
                    $declaration,
                    `move occurs because '${access.path.toString()}' has type '${$declaration.type.code}' which does not have 'Copy' semantics`,
                )
                .code(
                    $move,
                    `value moved here`,
                )
                .code(
                    $invalidUse,
                    `value used here after move`,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
