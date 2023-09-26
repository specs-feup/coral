laraImport("coral.ty.Ty");
laraImport("coral.ty.BorrowKind");
laraImport("coral.borrowck.RegionVariable");

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
        super(borrowKind === BorrowKind.MUTABLE ? `&'${regionVar.name} mut ` : `&'${regionVar.name} `,
            borrowKind === BorrowKind.SHARED,
            isConst,
            [regionVar]
        );
        
        this.borrowKind = borrowKind;
        this.referent = referent;
        this.regionVar = regionVar;
    }

    /**
     * @returns {boolean}
     */
    get isShared() {
        return this.borrowKind === BorrowKind.SHARED;
    }

    /**
     * @returns {boolean}
     */
    get isMutable() {
        return this.borrowKind === BorrowKind.MUTABLE;
    }

    /**
     * 
     * @param {RegionVariable} regionVar 
     */
    setRegionVar(regionVar) {
        this.regionVar = regionVar;
        this.lifetimes = [regionVar];
    }

    /**
     * 
     * @param {RefTy} other 
     * @returns {boolean}
     */
    equals(other) {
        return other instanceof RefTy &&
            this.borrowKind === other.borrowKind &&
            this.referent.equals(other.referent) &&
            this.regionVar === other.regionVar;
    }

    /**
     * 
     * @returns {string}
     */
    toString() {
        return this.name + this.referent.toString();
    }

    /**
     * @returns {RegionVariable[]}
     */
    nestedLifetimes() {
        return this.lifetimes.concat(this.referent.lifetimes);
    }

    /**
     * @returns {boolean}
     */
    get requiresLifetimes() {
        return true;
    }

}