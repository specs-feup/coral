import LifetimePragmaParseError from "@specs-feup/coral/error/pragma/parse/LifetimePragmaParseError";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";
import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";
import LfPath from "@specs-feup/coral/pragma/lifetime/path/LfPath";
import LfPathDeref from "@specs-feup/coral/pragma/lifetime/path/LfPathDeref";
import LfPathMemberAccess from "@specs-feup/coral/pragma/lifetime/path/LfPathMemberAccess";
import LfPathVarRef from "@specs-feup/coral/pragma/lifetime/path/LfPathVarRef";

export default class LifetimeAssignmentPragma {
    static keyword: string = "lf";

    // Check if the token is a valid C identifier
    static isIdentifier(s: string): boolean {
        return /^[a-zA-Z_][a-zA-Z_0-9]*$/.test(s);
    }

    lhs: LfPath;
    rhs: string;
    pragma: CoralPragma;

    constructor(pragma: CoralPragma) {
        this.pragma = pragma;
        let idx = 0;
        [idx, this.lhs] = LifetimeAssignmentPragma.#parseLhs(pragma, idx);

        if (pragma.tokens.at(idx) === undefined) {
            throw new LifetimePragmaParseError(pragma, "Expected '='");
        }
        if (pragma.tokens.at(idx) !== "=") {
            throw new LifetimePragmaParseError(
                pragma,
                `Expected '=', found '${pragma.tokens[idx]}'`,
            );
        }

        idx++;
        if (pragma.tokens.at(idx) === undefined) {
            throw new LifetimePragmaParseError(
                pragma,
                "Expected lifetime identifier after '='",
            );
        }
        if (!LifetimeBoundPragma.isLifetimeIdentifier(pragma.tokens[idx])) {
            throw new LifetimePragmaParseError(
                pragma,
                `Expected lifetime identifier, found '${pragma.tokens[idx]}'`,
            );
        }
        this.rhs = pragma.tokens[idx];

        idx++;
        if (pragma.tokens.at(idx) !== undefined) {
            throw new LifetimePragmaParseError(
                pragma,
                `Unexpected token '${pragma.tokens[idx]}'`,
            );
        }
    }

    static #parseLhs(pragma: CoralPragma, idx: number): [number, LfPath] {
        let tokens = pragma.tokens;
        let parens = 0;
        while (tokens.at(idx) === "(") {
            parens++;
            idx++;
        }

        let result: LfPath | undefined;
        const first = tokens.at(idx);
        idx++;
        if (first === undefined) {
            throw new LifetimePragmaParseError(pragma, "Expected lifetime assignment");
        }

        let canMemberAccess = true;
        if (first === "*") {
            canMemberAccess = false;
            [idx, result] = this.#parseDeref(pragma, idx);
        } else if (LifetimeAssignmentPragma.isIdentifier(first)) {
            result = new LfPathVarRef(first);
        } else {
            throw new LifetimePragmaParseError(
                pragma,
                `Expected identifier or '*', found '${first}'`,
            );
        }

        if (parens === 0 && canMemberAccess) {
            if (tokens.at(idx) === ".") {
                idx++;
                [idx, result] = this.#parseMemberAccess(
                    pragma,
                    idx,
                    result as LfPathDeref | LfPathVarRef,
                );
            } else if (tokens.at(idx) === "->") {
                idx++;
                [idx, result] = this.#parseMemberAccess(
                    pragma,
                    idx,
                    new LfPathDeref(result as LfPathDeref | LfPathVarRef),
                );
            }
        }

        while (parens > 0) {
            if (canMemberAccess && tokens.at(idx) === ".") {
                idx++;
                [idx, result] = this.#parseMemberAccess(
                    pragma,
                    idx,
                    result as LfPathDeref | LfPathVarRef,
                );
                canMemberAccess = false;
                break;
            } else if (canMemberAccess && tokens.at(idx) === "->") {
                idx++;
                [idx, result] = this.#parseMemberAccess(
                    pragma,
                    idx,
                    new LfPathDeref(result as LfPathDeref | LfPathVarRef),
                );
                canMemberAccess = false;
                break;
            } else if (tokens.at(idx) === undefined) {
                throw new LifetimePragmaParseError(pragma, "Expected ')'");
            } else if (tokens.at(idx) !== ")") {
                throw new LifetimePragmaParseError(
                    pragma,
                    `Expected ')', found '${tokens[idx]}'`,
                );
            }
            canMemberAccess = true;
            parens--;
            idx++;
        }

        if (canMemberAccess) {
            if (tokens.at(idx) === ".") {
                idx++;
                [idx, result] = this.#parseMemberAccess(
                    pragma,
                    idx,
                    result as LfPathDeref | LfPathVarRef,
                );
                canMemberAccess = false;
            } else if (tokens.at(idx) === "->") {
                idx++;
                [idx, result] = this.#parseMemberAccess(
                    pragma,
                    idx,
                    new LfPathDeref(result as LfPathDeref | LfPathVarRef),
                );
                canMemberAccess = false;
            }
        }

        while (parens > 0) {
            if (tokens.at(idx) === undefined) {
                throw new LifetimePragmaParseError(pragma, "Expected ')'");
            } else if (tokens.at(idx) !== ")") {
                throw new LifetimePragmaParseError(
                    pragma,
                    `Expected ')', found '${tokens[idx]}'`,
                );
            }
            parens--;
            idx++;
        }

        return [idx, result];
    }

    static #parseDeref(pragma: CoralPragma, idx: number): [number, LfPathDeref] {
        let tokens = pragma.tokens;
        let parens = 0;
        while (tokens.at(idx) === "(") {
            parens++;
            idx++;
        }

        let result: LfPathDeref | undefined;
        const first = tokens.at(idx);
        idx++;
        if (first === undefined) {
            throw new LifetimePragmaParseError(pragma, `Expected identifier or '*'`);
        }

        if (first === "*") {
            [idx, result] = this.#parseDeref(pragma, idx);
            result = new LfPathDeref(result);
        } else if (LifetimeAssignmentPragma.isIdentifier(first)) {
            result = new LfPathDeref(new LfPathVarRef(first));
        } else {
            throw new LifetimePragmaParseError(
                pragma,
                `Expected identifier or '*', found '${first}'`,
            );
        }

        while (parens > 0) {
            if (tokens.at(idx) === undefined) {
                throw new LifetimePragmaParseError(pragma, "Expected ')'");
            } else if (tokens.at(idx) !== ")") {
                throw new LifetimePragmaParseError(
                    pragma,
                    `Expected ')', found '${tokens[idx]}'`,
                );
            }
            parens--;
            idx++;
        }

        return [idx, result];
    }

    static #parseMemberAccess(
        pragma: CoralPragma,
        idx: number,
        inner: LfPathDeref | LfPathVarRef,
    ): [number, LfPathMemberAccess] {
        const tokens = pragma.tokens;
        const lfIdentifier = tokens.at(idx);
        if (lfIdentifier === undefined) {
            throw new LifetimePragmaParseError(pragma, "Expected lifetime identifier");
        }
        if (!LifetimeBoundPragma.isLifetimeIdentifier(lfIdentifier)) {
            throw new LifetimePragmaParseError(
                pragma,
                `Expected lifetime identifier, found '${lfIdentifier}'`,
            );
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
