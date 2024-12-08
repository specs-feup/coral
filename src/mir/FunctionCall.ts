import { Call, FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import Ty from "@specs-feup/coral/mir/ty/Ty";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";

export default class FunctionCall {
    $functionJp: FunctionJp;
    $callJp: Call;
    lifetimes: Map<string, RegionVariable>;
    returnTy: Ty;
    paramTys: Ty[];

    constructor(
        $jp: Call,
        lifetimes: Map<string, RegionVariable>,
        returnTy: Ty,
        paramTys: Ty[],
    ) {
        this.$callJp = $jp;
        this.$functionJp = $jp.function;
        this.lifetimes = lifetimes;
        this.returnTy = returnTy;
        this.paramTys = paramTys;
    }
}
