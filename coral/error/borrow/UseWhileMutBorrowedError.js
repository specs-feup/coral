laraImport("coral.error.CoralError");
laraImport("coral.error.ErrorMessageBuilder");

class UseWhileMutBorrowedError extends CoralError {
    constructor($invalidUse, loan, $nextLoanUse, access) {
        super(
            new ErrorMessageBuilder(`Cannot use '${access.path}' while mutably borrowed`, $invalidUse)
                .code(loan.node.data().stmts[0], `(mutable) borrow of '${loan.loanedPath}' occurs here`, loan.$jp)
                .code($invalidUse, `use of '${access.path}' occurs here, while borrow is still active`)
                .code($nextLoanUse, "borrow is later used here")
                .toString()
        );
        this.name = 'UseWhileMutBorrowedError';
    }
}
