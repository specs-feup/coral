import Ty from "@specs-feup/coral/mir/ty/Ty";
import BorrowKind from "@specs-feup/coral/mir/ty/BorrowKind";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";
import { PointerType } from "@specs-feup/clava/api/Joinpoints.js";

export default class RefTy extends Ty {
    regionVar: RegionVariable;
    referent: Ty;
    borrowKind: BorrowKind;
    override isConst: boolean;
    override $jp: PointerType;

    constructor(
        borrowKind: BorrowKind,
        referent: Ty,
        $jp: PointerType,
        regionVar: RegionVariable,
        isConst: boolean = false,
    ) {
        super();
        this.borrowKind = borrowKind;
        this.referent = referent;
        this.$jp = $jp;
        this.regionVar = regionVar;
        this.isConst = isConst;
    }

    override get name(): string {
        switch (this.borrowKind) {
            case BorrowKind.MUTABLE:
                return `${this.regionVar.name}*`;
            case BorrowKind.SHARED:
                return `const ${this.regionVar.name}*`;
        }
    }

    override get regionVars(): RegionVariable[] {
        return [this.regionVar];
    }

    override get semantics(): Ty.Semantics {
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
        return this.regionVars.concat(this.referent.nestedRegionVars);
    }
}
