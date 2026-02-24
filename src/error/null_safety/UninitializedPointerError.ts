import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";

export default class UninitializedPointerError extends CoralError {
    /**
     * @param $invalidUse - O Joinpoint onde o ponteiro é usado (ex: UnaryExpr no dereference)
     * @param varName - O nome da variável não inicializada
     * @param $declaration - O Joinpoint onde a variável foi declarada (Vardecl)
     */
    constructor($invalidUse: Joinpoint, varName: string, $declaration: Joinpoint) {
        super(
            new ErrorMessageBuilder(
                `Use of uninitialized pointer '${varName}'`,
                $invalidUse,
            )
                .code(
                    $invalidUse,
                    `pointer '${varName}' is used here but has not been initialized`,
                )
                .code(
                    $declaration,
                    `'${varName}' was declared here without an initial value`,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}