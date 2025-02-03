import { BuiltinType, EnumDecl } from "@specs-feup/clava/api/Joinpoints.js";
import Region from "@specs-feup/coral/mir/symbol/Region";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";

// TODO probably rename, because it can be enum
export default class BuiltinTy implements Ty, MetaTy {
    #name: string;
    #isConst: boolean;
    #jp: BuiltinType | EnumDecl;

    constructor(name: string, $jp: BuiltinType | EnumDecl, isConst: boolean) {
        this.#name = name;
        this.#jp = $jp;
        this.#isConst = isConst;
    }

    get regionVars(): Region[] {
        return [];
    }

    get semantics(): Ty.Semantics {
        return Ty.Semantics.COPY;
    }

    get isConst(): boolean {
        return this.#isConst;
    }

    get jp(): BuiltinType | EnumDecl {
        return this.#jp;
    }

    generateLifetimeAssignments(): [] {
        return [];
    }

    toString(): string {
        return this.#name;
    }

    toTy(): Ty {
        return this;
    }
}
