import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/Access";
import Loan from "@specs-feup/coral/mir/Loan";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";

export default class UseWhileMutBorrowedError extends CoralError {
    constructor(
        $invalidUse: Joinpoint,
        loan: Loan,
        $nextLoanUse: Joinpoint | undefined,
        access: Access,
    ) {
        const builder = new ErrorMessageBuilder(
            `Cannot use '${access.#path.toString()}' while mutably borrowed`,
            $invalidUse,
        )
            .code(
                loan.node.jp,
                `(mutable) borrow of '${loan.loanedPath.toString()}' occurs here`,
            )
            .code(
                $invalidUse,
                `use of '${access.#path.toString()}' occurs here, while borrow is still active`,
            );
        if ($nextLoanUse) {
            builder.code($nextLoanUse, "borrow is later used here");
        }

        super(builder.toString());
        this.name = this.constructor.name;
    }
}
