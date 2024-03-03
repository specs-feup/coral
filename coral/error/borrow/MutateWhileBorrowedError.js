laraImport("coral.error.CoralError");

class MutateWhileBorrowedError extends CoralError {
    constructor($invalidUse, loan, $nextUse, access) {
        super(
            new ErrorMessageBuilder(`Cannot mutate '${access.path}' while borrowed`, $invalidUse)
                .code(loan.node.data().stmts[0], `(${loan.borrowKind}) borrow of '${loan.loanedPath}' occurs here`)
                .code($invalidUse, `write or mutable borrow of '${access.path}' occurs here, while borrow is still active`)
                .code($nextUse, "borrow is later used here")
                .toString()
        );
        this.name = 'MutateWhileBorrowedError';
    }
}
