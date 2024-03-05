import Ty from "./Ty.js";
import BorrowKind from "./BorrowKind.js";
import RegionVariable from "../../regionck/RegionVariable.js";

export default class RefTy extends Ty {
    regionVar: RegionVariable;
    referent: Ty;
    borrowKind: BorrowKind;

    constructor(
        borrowKind: BorrowKind,
        referent: Ty,
        regionVar: RegionVariable,
        isConst: boolean = false,
    ) {
        super(
            borrowKind === BorrowKind.MUTABLE
                ? `&'${regionVar.name} mut `
                : `&'${regionVar.name} `,
            borrowKind === BorrowKind.SHARED,
            isConst,
            [regionVar],
        );

        this.borrowKind = borrowKind;
        this.referent = referent;
        this.regionVar = regionVar;
    }

    // TODO delete this
    get isShared(): boolean {
        return this.borrowKind === BorrowKind.SHARED;
    }

    // TODO delete this
    get isMutable(): boolean {
        return this.borrowKind === BorrowKind.MUTABLE;
    }

    setRegionVar(regionVar: RegionVariable) {
        this.regionVar = regionVar;
        this.lifetimes = [regionVar];
    }

    override equals(other: RefTy): boolean {
        return (
            other instanceof RefTy &&
            this.borrowKind === other.borrowKind &&
            this.referent.equals(other.referent) &&
            this.regionVar === other.regionVar
        );
    }

    override toString(): string {
        return this.name + this.referent.toString();
    }

    override nestedLifetimes(): RegionVariable[] {
        return this.lifetimes.concat(this.referent.lifetimes);
    }

    override get requiresLifetimes(): boolean {
        return true;
    }
}
