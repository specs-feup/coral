import { Call, FunctionJp } from "clava-js/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";
import RegionVariable from "coral/regionck/RegionVariable";

export default class FunctionCall {
    $functionJp: FunctionJp;
    $callJp: Call;
    lifetimes: Map<string, RegionVariable>;
    returnTy: Ty;
    paramTys: Ty[];

    constructor($jp: Call, lifetimes: Map<string, RegionVariable>, returnTy: Ty, paramTys: Ty[]) {
        this.$callJp = $jp;
        this.$functionJp = $jp.function;
        this.lifetimes = lifetimes;
        this.returnTy = returnTy;
        this.paramTys = paramTys;
    }
}
