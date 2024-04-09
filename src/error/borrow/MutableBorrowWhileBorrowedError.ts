import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import Loan from "coral/mir/Loan";
import { Joinpoint } from "clava-js/api/Joinpoints.js";

export default class MutableBorrowWhileBorrowedError extends CoralError {
    constructor($invalidUse: Joinpoint, loan: Loan, $nextUse: Joinpoint, access: Access) {
        super(
            new ErrorMessageBuilder(
                `Cannot borrow '${access.path.toString()}' as mutable because it is also borrowed as immutable`,
                $invalidUse,
            )
                .code(
                    loan.node.jp,
                    `immutable borrow of '${loan.loanedPath.toString()}' occurs here`,
                )
                .code(
                    $invalidUse,
                    `mutable borrow of '${access.path.toString()}' occurs here`,
                )
                .code($nextUse, "immutable borrow is later used here")
                .toString(),
        );
        this.name = this.constructor.name;
    }
}
