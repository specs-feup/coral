import { Pragma } from "@specs-feup/clava/api/Joinpoints.js";

export default class LifetimeAssignmentBuilder {
    #derefs: number;
    #lfAccess?: string;
    #param: string;

    constructor(param: string, derefs: number = 0, lfAccess?: string) {
        this.#param = param;
        this.#derefs = derefs;
        this.#lfAccess = lfAccess;
    }

    addDeref(): LifetimeAssignmentBuilder {
        return new LifetimeAssignmentBuilder(this.#param, this.#derefs + 1, this.#lfAccess);
    }

    withLfAccess(name: string): LifetimeAssignmentBuilder {
        return new LifetimeAssignmentBuilder(this.#param, this.#derefs, name);
    }

    toString() {
        if (this.#lfAccess === undefined) {
            return "*".repeat(this.#derefs) + this.#param;
        }
        
        if (this.#derefs === 0) {
            return `${this.#param}.${this.#lfAccess}`;
        }
        
        const stars = this.#derefs - 1;
        const starred = "*".repeat(stars) + this.#param;
        if (stars === 0) {
            return `${starred}->${this.#lfAccess}`;
        }
        return `(${starred})->${this.#lfAccess}`;
    }

    toPragma(rhs: string): Pragma {
        return new Pragma(`#pragma coral lf ${this.toString()} = ${rhs}`);
    }
}
