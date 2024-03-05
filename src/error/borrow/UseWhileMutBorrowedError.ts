import CoralError from "../CoralError.js";
import ErrorMessageBuilder from "../ErrorMessageBuilder.js";
import Access from "../../mir/Access.js";
import Loan from "../../mir/Loan.js";
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
                `Cannot use '${access.path}' while mutably borrowed`,
                $invalidUse,
            )
                .code(
                    loan.node.data().stmts[0],
                    `(mutable) borrow of '${loan.loanedPath}' occurs here`,
                    loan.$jp,
                )
                .code(
                    $invalidUse,
                    `use of '${access.path}' occurs here, while borrow is still active`,
                )
                .code($nextLoanUse, "borrow is later used here")
                .toString(),
        );
        this.name = "UseWhileMutBorrowedError";
    }
}
