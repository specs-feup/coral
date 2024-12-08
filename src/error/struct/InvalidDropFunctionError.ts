import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/Access";
import {
    FunctionJp,
    Joinpoint,
    RecordJp,
    Vardecl,
} from "@specs-feup/clava/api/Joinpoints.js";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";

export default class InvalidDropFunctionError extends CoralError {
    constructor(dropFnPragma: CoralPragma, $function: FunctionJp, message: string) {
        super(
            new ErrorMessageBuilder(
                "Struct has invalid drop function.",
                dropFnPragma.$jp.parent,
            )
                .code(
                    dropFnPragma.$jp.parent,
                    `Struct assigns drop function '${$function.name}' here.`,
                )
                .code(dropFnPragma.$jp.target)
                .blankLine()
                .blankLine()
                .codeString(
                    $function.originNode.code.split("\n")[0],
                    message,
                    $function.line,
                )
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
