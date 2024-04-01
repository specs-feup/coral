import { Vardecl } from "clava-js/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";

class Symbol {
    $jp: Vardecl;
    ty: Ty;
    state: Symbol.State;

    constructor($jp: Vardecl, ty: Ty) {
        this.$jp = $jp;
        this.ty = ty;
        this.state = Symbol.State.UNINITIALIZED;
    }

    toString(): string {
        return `${this.ty} ${this.$jp.name}`;
    }

    get name(): string {
        return this.$jp.name;
    }
}

namespace Symbol {
    export enum State {
        UNINITIALIZED = "uninitialized",
        VALID = "valid",
        MOVED = "moved",
        MAYBE_UNINITIALIZED = "maybe_uninitialized",
        MAYBE_MOVED = "maybe_moved",
    }
}

export default Symbol;
