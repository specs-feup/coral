import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import { Joinpoint, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";

export default class UseBeforeInitError extends CoralError {
    constructor($invalidUse: Joinpoint, $declaration: Vardecl, access: Access) {
        super(
            new ErrorMessageBuilder(
                `Used binding '${access.path.toString()}' is possibly uninitialized`,
                $invalidUse,
            )
                .code(
                    $declaration,
                    `binding declared here but left uninitialized`,
                )
                .code(
                    $invalidUse,
                    `'${access.path.toString()}' is used here but it isn't initialized`,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
