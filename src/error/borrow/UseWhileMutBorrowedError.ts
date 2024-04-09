import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import Loan from "coral/mir/Loan";
import { Joinpoint } from "clava-js/api/Joinpoints.js";

export default class UseWhileMutBorrowedError extends CoralError {
    constructor(
        $invalidUse: Joinpoint,
        loan: Loan,
        $nextLoanUse: Joinpoint,
        access: Access,
    ) {
        super(
            new ErrorMessageBuilder(
                `Cannot use '${access.path.toString()}' while mutably borrowed`,
                $invalidUse,
            )
                .code(
                    loan.node.jp,
                    `(mutable) borrow of '${loan.loanedPath.toString()}' occurs here`,
                )
                .code(
                    $invalidUse,
                    `use of '${access.path.toString()}' occurs here, while borrow is still active`,
                )
                .code($nextLoanUse, "borrow is later used here")
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
