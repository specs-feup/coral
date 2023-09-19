laraImport("coral.ty.Ty");
laraImport("coral.ty.BorrowKind");

class RefTy extends Ty {

    /**
     * @type {RegionVariable}
     */
    regionVar;

    /**
     * @type {Ty}
     */
    referent;

    /**
     * @type {BorrowKind}
     */
    borrowKind;


    constructor(borrowKind, referent, regionVar, isConst=false) {
        super(borrowKind === BorrowKind.MUTABLE ? `&'${regionVar.name} mut ` : `&'${regionVar.name} `, isConst);
        this.borrowKind = borrowKind;
        this.referent = referent;
        this.regionVar = regionVar;
    }

    /**
     * @returns boolean
     */
    get isShared() {
        return this.borrowKind === BorrowKind.SHARED;
    }

    /**
     * @returns boolean
     */
    get isMutable() {
        return this.borrowKind === BorrowKind.MUTABLE;
    }

    setRegionVar(regionVar) {
        this.regionVar = regionVar;
    }

    equals(other) {
        return other instanceof RefTy &&
            this.borrowKind === other.borrowKind &&
            this.referent.equals(other.referent) &&
            this.regionVar === other.regionVar;
    }

    toString() {
        return this.name + this.referent.toString();
    }

    get requiresLifetimes() {
        return true;
    } 

}