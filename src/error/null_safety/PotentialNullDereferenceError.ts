import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";

export default class PotentialNullDereferenceError extends CoralError {
    /**
     * @param $invalidUse - O Joinpoint onde ocorre a dereferência (ex: UnaryExpr ou MemberAccess)
     * @param varName - O nome da variável que pode ser nula
     * @param $origin - (Opcional) O Joinpoint onde o ponteiro foi originado (ex: a chamada ao malloc)
     */
    constructor($invalidUse: Joinpoint, varName: string, $origin?: Joinpoint) {
        const builder = new ErrorMessageBuilder(
            `Potential dereference of a null pointer '${varName}'`,
            $invalidUse,
        );

        builder.code(
            $invalidUse,
            `pointer '${varName}' might be null here`,
        );

        if ($origin) {
            builder.code(
                $origin,
                `this is where '${varName}' was initialized with a potentially null value`,
            );
        }

        super(builder.toString());
        this.name = this.constructor.name;
    }
}
