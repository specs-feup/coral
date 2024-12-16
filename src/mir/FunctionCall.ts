import { Call, FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";

export default class FunctionCall {
    #jp: Call;
    #lifetimes: Map<string, RegionVariable>;
    #returnTy: Ty;
    #paramTys: Ty[];

    constructor(
        $jp: Call,
        lifetimes: Map<string, RegionVariable>,
        returnTy: Ty,
        paramTys: Ty[],
    ) {
        this.#jp = $jp;
        this.#lifetimes = lifetimes;
        this.#returnTy = returnTy;
        this.#paramTys = paramTys;
    }

    get jp(): Call {
        return this.#jp;
    }

    get lifetimes(): Map<string, RegionVariable> {
        return this.#lifetimes;
    }

    get returnTy(): Ty {
        return this.#returnTy;
    }
    
    get paramTys(): Ty[] {
        return this.#paramTys;
    }
}
