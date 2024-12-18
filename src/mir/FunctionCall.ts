import { Call, FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import Region from "@specs-feup/coral/mir/symbol/Region";
import Ty from "@specs-feup/coral/mir/symbol/Ty";

export default class FunctionCall {
    #jp: Call;
    #lifetimes: Map<string, Region>; // TODO must include %static
    #returnTy: Ty;
    #paramTys: Ty[];

    constructor($jp: Call, lifetimes: Map<string, Region>, returnTy: Ty, paramTys: Ty[]) {
        this.#jp = $jp;
        this.#lifetimes = lifetimes;
        this.#returnTy = returnTy;
        this.#paramTys = paramTys;
    }

    get jp(): Call {
        return this.#jp;
    }

    get returnTy(): Ty {
        return this.#returnTy;
    }

    get paramTys(): Ty[] {
        return this.#paramTys;
    }
}
