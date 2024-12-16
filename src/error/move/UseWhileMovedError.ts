import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/Access";
import { Joinpoint, Type, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";

export default class UseWhileMovedError extends CoralError {
    constructor(
        $invalidUse: Joinpoint,
        $declaration: Vardecl,
        access: Access,
        move: Access,
    ) {
        super(
            new ErrorMessageBuilder(
                `Use of moved value '${access.#path.toString()}'`,
                $invalidUse,
            )
                .code(
                    $declaration,
                    `move occurs because '${move.#path.toString()}' has type '${move.#path.ty.name}' which does not have 'Copy' semantics`,
                )
                .code(move.#path.$jp, `value moved here`)
                .code($invalidUse, `value used here after move`)
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
