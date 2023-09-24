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
    ty;

    /**
     * @type {Path}
     */
    path;

    /**
     * JoinPoint where the loan was created
     * @type {JoinPoint}
     */
    $jp;


    constructor(regionVar, borrowKind, ty, path, $jp) {
        this.regionVar = regionVar;
        this.borrowKind = borrowKind;
        this.ty = ty;
        this.path = path;
        this.$jp = $jp;
    }

    toString() {
        return `${this.borrowKind} borrow of ${this.path.toString()} with lifetime '${this.regionVar.name}`;
    }

}
