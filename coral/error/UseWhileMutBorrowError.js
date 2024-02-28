laraImport("coral.error.CoralError");

class UseWhileMutBorrowError extends CoralError {
    constructor($invalidUse, loan, $nextUse, access) {
        // Line no
        const maxPaddingSize = Math.max($invalidUse.line, loan.$jp.line, $nextUse.line);
        // Weird NaN checking trick
        const linePaddingSize = maxPaddingSize === maxPaddingSize ? maxPaddingSize.toString().length + 1 : 3;
        const loanLineNum = loan.$jp.line?.toString().padEnd(linePaddingSize, " ") ?? "?";
        const assignmLine = $invalidUse.line?.toString().padEnd(linePaddingSize, " ") ?? "?";
        const nextUseLine = $nextUse.line?.toString().padEnd(linePaddingSize, " ") ?? "?";
        const linePadding = " ".repeat(linePaddingSize);
        
        let error = `Error: Cannot write to '${access.path}' while borrowed\n`;
        error += ` ${"-".repeat(linePaddingSize)}> ${$invalidUse.filename ?? "unknown"}:${$invalidUse.line ?? "??"}\n`;
        error += ` ${linePadding}|\t\n`;
        error += ` ${loanLineNum}|\t${loan.node.data().stmts[0].code}\n`;
        error += ` ${linePadding}|\t\t(${loan.borrowKind}) borrow of '${loan.loanedPath}' occurs here\n`;
        error += ` ${assignmLine}|\t${$invalidUse.code}\n`;
        error += ` ${linePadding}|\t\twrite to '${access.path}' occurs here, while borrow is still active\n`;
        error += ` ${nextUseLine}|\t${$nextUse.code}\n`;
        error += ` ${linePadding}|\t\tborrow is later used here\n`;
        error += ` ${linePadding}|\t\n`;
        error += ` ${access.mutability} and ${loan.borrowKind}\n`;

        super(error);
        this.name = 'UseWhileMutBorrowError';
    }
}
