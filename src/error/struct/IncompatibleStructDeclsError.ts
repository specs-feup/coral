import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/Access";
import { Joinpoint, RecordJp, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";

export default class IncompatibleStructDeclsError extends CoralError {
    constructor(
        $firstStruct: RecordJp,
        firstPragma: CoralPragma | undefined,
        firstMessage: string,
        $secondStruct: RecordJp,
        secondPragma: CoralPragma | undefined,
        secondMessage: string,
        undefinedMessage: string,
    ) {
        if ($firstStruct.line > $secondStruct.line) {
            [$firstStruct, $secondStruct] = [$secondStruct, $firstStruct];
            [firstPragma, secondPragma] = [secondPragma, firstPragma];
            [firstMessage, secondMessage] = [secondMessage, firstMessage];
        }

        const builder = new ErrorMessageBuilder(
            "Struct has incompatible declarations.",
            $secondStruct,
        );

        if (firstPragma === undefined) {
            builder.code($firstStruct, undefinedMessage);
        } else {
            builder.code(firstPragma.$jp.parent, firstMessage).code($firstStruct);
        }

        builder.blankLine();

        if (secondPragma === undefined) {
            builder.code($secondStruct, undefinedMessage);
        } else {
            builder.code(secondPragma.$jp.parent, secondMessage).code($secondStruct);
        }

        super(builder.toString());
        this.name = this.constructor.name;
    }
}
