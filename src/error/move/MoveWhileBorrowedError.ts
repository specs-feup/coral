import CoralError from "coral/error/CoralError";
import ErrorMessageBuilder from "coral/error/ErrorMessageBuilder";
import Access from "coral/mir/Access";
import Loan from "coral/mir/Loan";
import { Joinpoint } from "clava-js/api/Joinpoints.js";

export default class MoveWhileBorrowedError extends CoralError {
    constructor($invalidUse: Joinpoint, loan: Loan, $nextUse: Joinpoint | undefined, access: Access) {
        const builder = new ErrorMessageBuilder(
            `Cannot move out of '${access.path.toString()}' because it is borrowed`,
            $invalidUse,
        )
            .code(
                loan.node.jp,
                `(${loan.borrowKind}) borrow of '${loan.loanedPath.toString()}' occurs here`,
            )
            .code(
                $invalidUse,
                `move out of '${access.path.toString()}' occurs here, while borrow is still active`,
            );
        if ($nextUse) {
            builder.code($nextUse, "borrow is later used here")
        }
        super(builder.toString());
        this.name = this.constructor.name;
    }
}
