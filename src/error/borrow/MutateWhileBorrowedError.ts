import CoralError from "../CoralError.js";
import ErrorMessageBuilder from "../ErrorMessageBuilder.js";
import Access from "../../mir/Access.js";
import Loan from "../../mir/Loan.js";
import { Joinpoint } from "clava-js/api/Joinpoints.js";

export default class MutateWhileBorrowedError extends CoralError {
    constructor($invalidUse: Joinpoint, loan: Loan, $nextUse: Joinpoint, access: Access) {
        super(
            new ErrorMessageBuilder(
                `Cannot mutate '${access.path}' while borrowed`,
                $invalidUse,
            )
                .code(
                    loan.node.data().stmts[0],
                    `(${loan.borrowKind}) borrow of '${loan.loanedPath}' occurs here`,
                )
                .code(
                    $invalidUse,
                    `write or mutable borrow of '${access.path}' occurs here, while borrow is still active`,
                )
                .code($nextUse, "borrow is later used here")
                .toString(),
        );
        this.name = "MutateWhileBorrowedError";
    }
}
