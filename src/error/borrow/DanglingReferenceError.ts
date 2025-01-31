import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/action/Access";
import Loan from "@specs-feup/coral/mir/action/Loan";

export default class DanglingReferenceError extends CoralError {
    constructor(
        $scopeEnd: Joinpoint,
        loan: Loan,
        $nextUse: Joinpoint | undefined,
        access: Access,
    ) {
        const builder = new ErrorMessageBuilder(
            `'${access.path.toString()}' does not live long enough`,
            loan.path.jp,
        )
            .code(access.path.vardecl, `'${access.path.toString()}' declared here`)
            .code(loan.path.jp, `borrowed value does not live long enough`)
            .codeString(
                "}",
                `'${access.path.toString()}' dropped here while still borrowed`,
                $scopeEnd.originNode.endLine,
            );

        if ($nextUse) {
            builder.code($nextUse, "borrow is later used here");
        }

        super(builder.toString());

        this.name = this.constructor.name;
    }
}
