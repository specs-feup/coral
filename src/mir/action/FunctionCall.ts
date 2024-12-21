import { Call } from "@specs-feup/clava/api/Joinpoints.js";
import Region from "@specs-feup/coral/mir/symbol/Region";
import Ty from "@specs-feup/coral/mir/symbol/Ty";

export default class FunctionCall {
    #jp: Call;
    #regions: Map<string, Region>;
    #returnTy: Ty;
    #paramTys: Ty[];

    constructor($jp: Call, regions: Map<string, Region>, returnTy: Ty, paramTys: Ty[]) {
        this.#jp = $jp;
        this.#regions = regions;
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
