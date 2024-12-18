
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import RefTy from "@specs-feup/coral/mir/symbol/ty/RefTy";
import Loan from "@specs-feup/coral/mir/Loan";
import { PointerType } from "@specs-feup/clava/api/Joinpoints.js";
import Region from "@specs-feup/coral/regionck/Region";

export default class MetaRefTy implements MetaTy {
    #metaRegionVar: MetaRegion;
    #referent: MetaTy;
    #isConst: boolean;
    #jp: PointerType;

    constructor(
        regionVar: MetaRegion,
        referent: MetaTy,
        $jp: PointerType,
        isConst: boolean,
    ) {
        this.#metaRegionVar = regionVar;
        this.#referent = referent;
        this.#jp = $jp;
        this.#isConst = isConst;
    }

    get borrowKind(): Loan.Kind {
        return this.#referent.isConst ? Loan.Kind.SHARED : Loan.Kind.MUTABLE;
    }

    get semantics(): Ty.Semantics {
        switch (this.borrowKind) {
            case Loan.Kind.MUTABLE:
                return Ty.Semantics.MOVE;
            case Loan.Kind.SHARED:
                return Ty.Semantics.COPY;
        }
    }

    get isConst(): boolean {
        return this.#isConst;
    }

    get jp(): PointerType {
        return this.#jp;
    }

    toTy(regionVarMap: Map<string, Region>): Ty {
        const regionVar = regionVarMap.get(this.#metaRegionVar.name);
        if (regionVar === undefined) {
            throw new Error(
                `Region variable ${this.#metaRegionVar.name} not found in map`,
            );
        }

        return new RefTy(
            regionVar,
            this.#referent.toTy(regionVarMap),
            this.#jp,
            this.#isConst,
        );
    }
}
