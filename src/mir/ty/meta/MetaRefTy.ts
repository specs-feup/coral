import Ty from "@specs-feup/coral/mir/ty/Ty";
import BorrowKind from "@specs-feup/coral/mir/ty/BorrowKind";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";
import { PointerType } from "@specs-feup/clava/api/Joinpoints.js";
import MetaTy from "@specs-feup/coral/mir/ty/meta/MetaTy";
import MetaRegionVariable from "@specs-feup/coral/regionck/MetaRegionVariable";
import RefTy from "@specs-feup/coral/mir/ty/RefTy";

export default class MetaRefTy implements MetaTy {
    metaRegionVar: MetaRegionVariable;
    referent: MetaTy;
    borrowKind: BorrowKind;
    isConst: boolean;
    $jp: PointerType;

    constructor(
        borrowKind: BorrowKind,
        referent: MetaTy,
        $jp: PointerType,
        regionVar: MetaRegionVariable,
        isConst: boolean = false,
    ) {
        this.borrowKind = borrowKind;
        this.referent = referent;
        this.$jp = $jp;
        this.metaRegionVar = regionVar;
        this.isConst = isConst;
    }

    get semantics(): Ty.Semantics {
        switch (this.borrowKind) {
            case BorrowKind.MUTABLE:
                return Ty.Semantics.MOVE;
            case BorrowKind.SHARED:
                return Ty.Semantics.COPY;
        }
    }

    toTy(regionVarMap: Map<string, RegionVariable>): Ty {
        const regionVar = regionVarMap.get(this.metaRegionVar.name);
        if (regionVar === undefined) {
            throw new Error(
                `Region variable ${this.metaRegionVar.name} not found in map`,
            );
        }

        return new RefTy(
            this.borrowKind,
            this.referent.toTy(regionVarMap),
            this.$jp,
            regionVar,
            this.isConst,
        );
    }
}
