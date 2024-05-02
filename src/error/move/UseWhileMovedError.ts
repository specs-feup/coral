import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import { Joinpoint, Type, Vardecl } from "clava-js/api/Joinpoints.js";

export default class UseWhileMovedError extends CoralError {
    constructor($invalidUse: Joinpoint, $declaration: Vardecl, access: Access, move: Access) {
        super(
            new ErrorMessageBuilder(
                `Use of moved value '${access.path.toString()}'`,
                $invalidUse,
            )
                .code(
                    $declaration,
                    `move occurs because '${move.path.toString()}' has type '${move.path.ty.name}' which does not have 'Copy' semantics`,
                )
                .code(move.path.$jp, `value moved here`)
                .code($invalidUse, `value used here after move`)
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
