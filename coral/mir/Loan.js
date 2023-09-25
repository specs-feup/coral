laraImport("coral.borrowck.RegionVariable");

laraImport("coral.mir.path.Path");
laraImport("coral.ty.Ty");

class Loan {

    /**
     * @type {RegionVariable}
     */
    regionVar;

    /**
     * @type {BorrowKind}
     */
    borrowKind;

    /**
     * @type {Ty}
     */
    loanedTy;

    /**
     * @type {Path}
     */
    loanedPath;

    /**
     * JoinPoint where the loan was created
     * @type {JoinPoint}
     */
    $jp;


    constructor(regionVar, borrowKind, loanedTy, loanedPath, $jp) {
        this.regionVar = regionVar;
        this.borrowKind = borrowKind;
        this.loanedTy = loanedTy;
        this.loanedPath = loanedPath;
        this.$jp = $jp;
    }

    toString() {
        return `${this.borrowKind} borrow of ${this.loanedPath.toString()} with lifetime '${this.regionVar.name}`;
    }

}
