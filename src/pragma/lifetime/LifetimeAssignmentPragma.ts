import CoralPragma from "coral/pragma/CoralPragma";
import LifetimeBoundPragma from "coral/pragma/lifetime/LifetimeBoundPragma";
import LfPath from "coral/pragma/lifetime/path/LfPath";
import LfPathDeref from "coral/pragma/lifetime/path/LfPathDeref";
import LfPathMemberAccess from "coral/pragma/lifetime/path/LfPathMemberAccess";
import LfPathVarRef from "coral/pragma/lifetime/path/LfPathVarRef";

export default class LifetimeAssignmentPragma {
    static keyword: string = "lf";

    // Check if the token is a valid C identifier
    static isIdentifier(s: string): boolean {
        return /^\[a-zA-Z_][a-zA-Z_0-9]*$/.test(s);
    }

    lhs: LfPath;
    rhs: string;
    pragma: CoralPragma;

    constructor(pragma: CoralPragma) {
        this.pragma = pragma;
        let idx = 0;
        [idx, this.lhs] = LifetimeAssignmentPragma.#parseLhs(pragma.tokens, idx);
        if (pragma.tokens.at(idx) !== "=") {
            // TODO error
        }
        idx++;
        if (pragma.tokens.length !== idx + 1) {
            // TODO error
        }
        if (!LifetimeBoundPragma.isLifetimeIdentifier(pragma.tokens[idx])) {
            // TODO error
        }
        this.rhs = pragma.tokens[idx];
    }

    static #parseLhs(tokens: string[], idx: number): [number, LfPath] {
        let parens = 0;
        while (tokens.at(idx) === "(") {
            parens++;
            idx++;
        }

        let result: LfPath | undefined;
        const first = tokens.at(idx);
        idx++;
        if (first === undefined) {
            // TODO error
            throw new Error();
        }

        let canMemberAccess = true;
        if (first === "*") {
            canMemberAccess = false;
            result = this.#parseDeref(tokens, idx);
        } else if (LifetimeAssignmentPragma.isIdentifier(first)) {
            result = new LfPathVarRef(first);
        } else {
            // TODO new error
            throw new Error();
        }

        while (parens > 0) {
            if (canMemberAccess && tokens.at(idx) === ".") {
                idx++;
                result = this.#parseMemberAccess(tokens, idx, result as LfPathDeref | LfPathVarRef);
                break;
            } else if (canMemberAccess && tokens.at(idx) === "->") {
                idx++;
                result = this.#parseMemberAccess(tokens, idx, new LfPathDeref(result as LfPathDeref | LfPathVarRef));
                break;
            } else if (tokens.at(idx) !== ")") {
                // TODO error
            }
            canMemberAccess = true;
            parens--;
            idx++;
        }

        while (parens > 0) {
            if (tokens.at(idx) !== ")") {
                // TODO error
            }
            parens--;
            idx++;
        }

        return [idx, result];
    }

    static #parseDeref(tokens: string[], idx: number): [number, LfPathDeref] {
        let parens = 0;
        while (tokens.at(idx) === "(") {
            parens++;
            idx++;
        }

        let result: LfPathDeref | undefined;
        const first = tokens.at(idx);
        idx++;
        if (first === undefined) {
            // TODO error
            throw new Error();
        }

        if (first === "*") {
            [idx, result] = this.#parseDeref(tokens, idx);
            result = new LfPathDeref(result);
        } else if (LifetimeAssignmentPragma.isIdentifier(first)) {
            result = new LfPathDeref(new LfPathVarRef(first));
        } else {
            // TODO new error
            throw new Error();
        }

        while (parens > 0) {
            if (tokens.at(idx) !== ")") {
                // TODO error
            }
            parens--;
            idx++;
        }

        return [idx, result]
    }

    static #parseMemberAccess(tokens: string[], idx: number, inner: LfPathDeref | LfPathVarRef): [number, LfPathMemberAccess] {
        const lfIdentifier = tokens.at(idx);
        if (lfIdentifier === undefined || !LifetimeBoundPragma.isLifetimeIdentifier(lfIdentifier)) {
            // TODO error
            throw new Error();
        }
        idx++;
        
        return [idx, new LfPathMemberAccess(inner, lfIdentifier)];
    }

    static parse(pragmas: CoralPragma[]): LifetimeAssignmentPragma[] {
        return pragmas
            .filter((p) => p.name === LifetimeAssignmentPragma.keyword)
            .map((p) => new LifetimeAssignmentPragma(p));
    }
}
