laraImport("coral.borrowck.RegionVariable");

laraImport("coral.mir.path.Path");
laraImport("coral.ty.Ty");

class Loan {

    /**
     * @type {RegionVariable}
     */
    regionVar;

    /**
     * @type {Ty}
     */
    leftTy

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


    constructor(regionVar, leftTy, loanedTy, loanedPath, $jp) {
        this.regionVar = regionVar;
        this.leftTy = leftTy;
        this.loanedTy = loanedTy;
        this.loanedPath = loanedPath;
        this.$jp = $jp;
    }

    toString() {
        return `${this.borrowKind} borrow of ${this.loanedPath.toString()} with lifetime '${this.regionVar.name}`;
    }

    /**
     * @returns {BorrowKind}
     */
    get borrowKind() {
        return this.leftTy.borrowKind;
    }

}
