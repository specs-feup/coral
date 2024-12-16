import CoralError from "@specs-feup/coral/error/CoralError";
import ErrorMessageBuilder from "@specs-feup/coral/error/ErrorMessageBuilder";
import Access from "@specs-feup/coral/mir/Access";
import Loan from "@specs-feup/coral/mir/Loan";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";

export default class MutableBorrowWhileBorrowedError extends CoralError {
    constructor(
        $invalidUse: Joinpoint,
        loan: Loan,
        $nextUse: Joinpoint | undefined,
        access: Access,
    ) {
        const builder = new ErrorMessageBuilder(
            `Cannot borrow '${access.#path.toString()}' as mutable because it is also borrowed as immutable`,
            $invalidUse,
        )
            .code(
                loan.node.jp,
                `immutable borrow of '${loan.loanedPath.toString()}' occurs here`,
            )
            .code(
                $invalidUse,
                `mutable borrow of '${access.#path.toString()}' occurs here`,
            );
        if ($nextUse) {
            builder.code($nextUse, "immutable borrow is later used here");
        }
        super(builder.toString());
        this.name = this.constructor.name;
    }
}
