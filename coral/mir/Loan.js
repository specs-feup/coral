laraImport("coral.borrowck.RegionVariable");

laraImport("coral.mir.path.Path");
laraImport("coral.ty.Ty");
laraImport("coral.ty.RefTy");

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


    /**
     * @type {cytoscape node}
     */
    node;


    constructor(regionVar, leftTy, loanedTy, loanedPath, $jp, node) {
        this.regionVar = regionVar;
        this.leftTy = leftTy;
        this.loanedTy = loanedTy;
        this.loanedPath = loanedPath;
        this.$jp = $jp;
        this.node = node;
    }

    toString() {
        return `${this.borrowKind == BorrowKind.MUTABLE ? "&mut" : "&"}'${this.regionVar.name} ${this.loanedPath.toString()}`;
    }

    /**
     * @returns {BorrowKind}
     */
    get borrowKind() {
        return this.leftTy.borrowKind;
    }

    /**
     * @returns {RefTy}
     */
    get loanedRefTy() {
        // TODO: What about isConst?
        return new RefTy(this.borrowKind, this.loanedTy, this.regionVar);
    }

}
