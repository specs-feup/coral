import { Vardecl } from "clava-js/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";

export default class Declaration {
    $jp: Vardecl;
    ty: Ty;

    constructor($jp: Vardecl, ty: Ty) {
        this.$jp = $jp;
        this.ty = ty;
    }

    toString(): string {
        return `${this.ty} ${this.$jp.name}`;
    }

    get name(): string {
        return this.$jp.name;
    }
}
