import Region from "@specs-feup/coral/regionck/RegionVariable";
import { PointerType } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import Loan from "@specs-feup/coral/mir/Loan";

export default class RefTy implements Ty {
    #regionVar: Region;
    #referent: Ty;
    #isConst: boolean;
    #jp: PointerType;

    constructor(regionVar: Region, referent: Ty, $jp: PointerType, isConst: boolean) {
        this.#referent = referent;
        this.#jp = $jp;
        this.#regionVar = regionVar;
        this.#isConst = isConst;
    }

    get regionVar(): Region {
        return this.#regionVar;
    }

    get referent(): Ty {
        return this.#referent;
    }

    get regionVars(): Region[] {
        return [this.regionVar].concat(this.referent.regionVars);
    }

    get loanKind(): Loan.Kind {
        return this.referent.isConst ? Loan.Kind.SHARED : Loan.Kind.MUTABLE;
    }

    get semantics(): Ty.Semantics {
        switch (this.loanKind) {
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

    toString(): string {
        const base = `${this.regionVar.name}* ${this.referent.toString()}`;
        switch (this.loanKind) {
            case Loan.Kind.MUTABLE:
                return base;
            case Loan.Kind.SHARED:
                return "const " + base;
        }
    }
}
