import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";

export default class UseAfterFreeError extends CoralError {
    /**
     * @param $invalidUse - O local onde o ponteiro libertado é usado (ex: *p = 10)
     * @param varName - O nome da variável
     * @param $freeCall - O local onde o free() foi chamado
     */
    constructor($invalidUse: Joinpoint, varName: string, $freeCall: Joinpoint) {
        super(
            new ErrorMessageBuilder(
                `Use-after-free of pointer '${varName}'`,
                $invalidUse,
            )
                .code(
                    $invalidUse,
                    `pointer '${varName}' is dereferenced here after being freed`,
                )
                .code(
                    $freeCall,
                    `memory was released here`,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
