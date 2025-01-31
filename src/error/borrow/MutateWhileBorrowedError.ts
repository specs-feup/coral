import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import Loan from "@specs-feup/coral/mir/action/Loan";
import Access from "@specs-feup/coral/mir/action/Access";

export default class MutateWhileBorrowedError extends CoralError {
    constructor(
        $invalidUse: Joinpoint,
        loan: Loan,
        $nextUse: Joinpoint | undefined,
        access: Access,
    ) {
        const builder = new ErrorMessageBuilder(
            `Cannot write to '${access.path.toString()}' while borrowed`,
            $invalidUse,
        )
            .code(
                loan.path.jp,
                `(${loan.kind}) borrow of '${loan.path.toString()}' occurs here`,
            )
            .code(
                $invalidUse,
                `write to '${access.path.toString()}' occurs here, while borrow is still active`,
            );
        if ($nextUse) {
            builder.code($nextUse, "borrow is later used here");
        }
        super(builder.toString());
        this.name = this.constructor.name;
    }
}
