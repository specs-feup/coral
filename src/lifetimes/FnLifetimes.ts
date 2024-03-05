import CoralError from "../error/CoralError.js";
import { BuiltinType, FunctionJp, Pragma } from "clava-js/api/Joinpoints.js";

export default class FnLifetimes {
    $function: FunctionJp;
    returnLifetimes: string[];
    paramLifetimes: Map<String, String[]>;

    #declaredLifetimes: string[] | undefined;
    #declaredParamLifetimes: string[] | undefined;

    constructor($function: FunctionJp) {
        this.$function = $function;
        this.returnLifetimes = [];
        this.paramLifetimes = new Map();
        this.#parsePragmas();
    }

    get pragmas(): Pragma[] {
        return this.$function.pragmas.filter((p) => p.name === "coral_lf");
    }

    get declaredParamLifetimes() {
        if (this.#declaredParamLifetimes === undefined) {
            const _declaredParamLifetimes: Set<string> = new Set();

            for (const lfs of this.paramLifetimes.values())
                for (const lf of lfs) _declaredParamLifetimes.add(lf.toString());

            this.#declaredParamLifetimes = Array.from(_declaredParamLifetimes).sort();
        }

        return this.#declaredParamLifetimes;
    }

    get declaredLifetimes() {
        if (this.#declaredLifetimes === undefined) {
            const _declaredLifetimes: Set<string> = new Set();

            for (const lfs of this.paramLifetimes.values())
                for (const lf of lfs) _declaredLifetimes.add(lf.toString());

            for (const lf of this.returnLifetimes) _declaredLifetimes.add(lf.toString());

            this.#declaredLifetimes = Array.from(_declaredLifetimes).sort();
        }

        return this.#declaredLifetimes;
    }

    get requiresReturnLifetimes() {
        // TODO: Elaborated types
        return this.$function.returnType.isPointer;
    }

    setReturnLifetimes(lfs: string[]) {
        this.returnLifetimes = lfs;
        this.#declaredLifetimes = undefined;
    }

    setParamLifetimes(name: string, lfs: string[]) {
        this.paramLifetimes.set(name, lfs);
        this.#declaredLifetimes = undefined;
        this.#declaredParamLifetimes = undefined;
    }

    /**
     * Parses pragmas and sets the lifetimes
     */
    #parsePragmas() {
        for (const p of this.pragmas) {
            let content = p.content.split(" ");
            let target: string | undefined;
            if (content[0].startsWith("%")) {
                // Return lifetime
                if (
                    this.$function.returnType instanceof BuiltinType &&
                    this.$function.returnType.isVoid
                ) {
                    throw new CoralError("Cannot have return lifetimes on void function");
                }
                if (this.returnLifetimes.length !== 0) {
                    throw new CoralError(
                        "Multiple lifetime definitions for return value",
                    );
                }
            } else {
                // Parameter lifetime
                target = content[0];
                if (!this.$function.params.some((e) => e.name === target)) {
                    throw new CoralError(`Unknown parameter ${target}`);
                }
                // TODO: Check if param requires lifetimes
                if (this.paramLifetimes.has(target)) {
                    throw new CoralError(
                        `Multiple lifetime definitions for parameter ${target}`,
                    );
                }
                content = content.slice(1);
            }

            // Lifetimes
            const lfs = [];
            for (const lf of content) {
                // Remove the leading %
                lfs.push(lf.slice(1));
            }

            if (target === undefined) {
                this.returnLifetimes = lfs;
            } else {
                this.paramLifetimes.set(target, lfs);
            }
        }

        if (!this.#isReturnLifetimeFromParams()) {
            throw new CoralError("Every return type lifetime must come from a parameter");
        }
    }

    /**
     *
     * @returns {boolean} True if every return lifetime is defined in a parameter
     */
    #isReturnLifetimeFromParams() {
        return this.returnLifetimes.every((e) => this.declaredParamLifetimes.includes(e));
    }

    /**
     * Overwrites the pragmas of the function with the new lifetimes
     */
    overwritePragmas() {
        const toDetatch = this.pragmas;
        for (let p of toDetatch) {
            p.detach();
        }

        for (const [name, lf] of this.paramLifetimes.entries()) {
            this.$function.insertBefore(
                `#pragma coral_lf ${name} ${lf.map((e) => "%" + e).join(" ")}`,
            );
        }

        if (this.returnLifetimes.length > 0) {
            this.$function.insertBefore(
                `#pragma coral_lf ${this.returnLifetimes.map((e) => "%" + e).join(" ")}`,
            );
        }
    }
}
