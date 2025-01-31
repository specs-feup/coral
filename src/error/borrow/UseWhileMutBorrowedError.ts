import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import Loan from "@specs-feup/coral/mir/action/Loan";
import Access from "@specs-feup/coral/mir/action/Access";

export default class UseWhileMutBorrowedError extends CoralError {
    constructor(
        $invalidUse: Joinpoint,
        loan: Loan,
        $nextLoanUse: Joinpoint | undefined,
        access: Access,
    ) {
        const builder = new ErrorMessageBuilder(
            `Cannot use '${access.path.toString()}' while mutably borrowed`,
            $invalidUse,
        )
            .code(
                loan.path.jp,
                `(mutable) borrow of '${loan.path.toString()}' occurs here`,
            )
            .code(
                $invalidUse,
                `use of '${access.path.toString()}' occurs here, while borrow is still active`,
            );
        if ($nextLoanUse) {
            builder.code($nextLoanUse, "borrow is later used here");
        }

        super(builder.toString());
        this.name = this.constructor.name;
    }
}
