import Path from "@specs-feup/coral/mir/path/Path";
import RefTy from "@specs-feup/coral/mir/symbol/ty/RefTy";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";

class Loan {
    #loanedPath: Path;
    #regionVar: RegionVariable;
    #reborrow: boolean;
    #leftTy: RefTy;
    #rightTy: RefTy;

    constructor(
        loanedPath: Path,
        regionVar: RegionVariable,
        reborrow: boolean,
        leftTy: RefTy,
    ) {
        this.#loanedPath = loanedPath;
        this.#regionVar = regionVar;
        this.#reborrow = reborrow;
        this.#leftTy = leftTy;
        this.#rightTy = new RefTy(
            this.#regionVar,
            this.#loanedPath.ty,
            this.#leftTy.jp,
            this.#leftTy.isConst,
        );
    }

    toString(): string {
        return `${this.kind.toString} ${this.#regionVar.name} ${this.#loanedPath.toString()}`;
    }

    get kind(): Loan.Kind {
        return this.#leftTy.loanKind;
    }
}

namespace Loan {
    export enum Kind {
        SHARED = "shared",
        MUTABLE = "mutable",
    }

    export namespace Kind {
        export function toString(kind: Kind): string {
            if (kind === Kind.SHARED) {
                return "&const";
            } else {
                return "&mut";
            }
        }
    }
}

export default Loan;
