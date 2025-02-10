import Path from "@specs-feup/coral/mir/path/Path";
import Region from "@specs-feup/coral/mir/symbol/Region";
import RefTy from "@specs-feup/coral/mir/symbol/ty/RefTy";

class Loan {
    #path: Path;
    #region: Region;
    #reborrow: boolean;
    #leftTy: RefTy;
    #rightTy: RefTy;

    constructor(path: Path, region: Region, reborrow: boolean, leftTy: RefTy) {
        this.#path = path;
        this.#region = region;
        this.#reborrow = reborrow;
        this.#leftTy = leftTy;
        this.#rightTy = new RefTy(
            this.#region,
            this.#path.ty,
            this.#leftTy.jp,
            this.#leftTy.isConst,
        );
    }

    toString(): string {
        return `${this.kind} ${this.#region.name} ${this.#path.toString()}`;
    }

    get kind(): Loan.Kind {
        return this.#leftTy.loanKind;
    }

    get isReborrow(): boolean {
        return this.#reborrow;
    }

    get path(): Path {
        return this.#path;
    }

    get region(): Region {
        return this.#region;
    }

    get leftTy(): RefTy {
        return this.#leftTy;
    }

    get rightTy(): RefTy {
        return this.#rightTy;
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
