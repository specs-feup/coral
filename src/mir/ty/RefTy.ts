import Ty from "coral/mir/ty/Ty";
import BorrowKind from "coral/mir/ty/BorrowKind";
import RegionVariable from "coral/regionck/RegionVariable";

export default class RefTy extends Ty {
    regionVar: RegionVariable;
    referent: Ty;
    borrowKind: BorrowKind;
    override isConst: boolean;

    constructor(
        borrowKind: BorrowKind,
        referent: Ty,
        regionVar: RegionVariable,
        isConst: boolean = false,
    ) {
        super();
        this.borrowKind = borrowKind;
        this.referent = referent;
        this.regionVar = regionVar;
        this.isConst = isConst;
    }

    get name(): string {
        switch (this.borrowKind) {
            case BorrowKind.MUTABLE:
                return `&'${this.regionVar.name} mut`;
            case BorrowKind.SHARED:
                return `&'${this.regionVar.name}`;
        }
    }

    get regionVars(): RegionVariable[] {
        return [this.regionVar];
    }

    get semantics(): Ty.Semantics {
        switch (this.borrowKind) {
            case BorrowKind.MUTABLE:
                return Ty.Semantics.MOVE;
            case BorrowKind.SHARED:
                return Ty.Semantics.COPY;
        }
    }

    override equals(other: RefTy): boolean {
        return (
            other instanceof RefTy &&
            this.borrowKind === other.borrowKind &&
            this.referent.equals(other.referent) &&
            this.regionVar === other.regionVar &&
            this.isConst === other.isConst
        );
    }

    override toString(): string {
        return `${this.name} ${this.referent.toString()}`;
    }

    override get nestedRegionVars(): RegionVariable[] {
        return this.regionVars.concat(this.referent.regionVars);
    }
}
