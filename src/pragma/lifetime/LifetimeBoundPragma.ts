import LifetimePragmaParseError from "@specs-feup/coral/error/pragma/parse/LifetimePragmaParseError";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";

export default class LifetimeBoundPragma {
    static keyword: string = "lf";

    // Check if the token is a valid lifetime identifier, which is
    // like a C identifier but preceded by a % sign
    static isLifetimeIdentifier(s: string): boolean {
        return /^\%[a-zA-Z_][a-zA-Z_0-9]*$/.test(s);
    }

    name: string;
    bound?: string;
    pragma: CoralPragma;

    constructor(pragma: CoralPragma) {
        this.pragma = pragma;
        const tokens = pragma.tokens;
        let idx = 0;

        if (tokens.at(idx) === undefined) {
            throw new LifetimePragmaParseError(pragma, "Expected lifetime identifier");
        }
        if (!LifetimeBoundPragma.isLifetimeIdentifier(tokens[0])) {
            throw new LifetimePragmaParseError(
                pragma,
                `Expected lifetime identifier, found '${pragma.tokens[idx]}'`,
            );
        }
        this.name = tokens[idx];

        idx++;
        if (tokens.at(idx) === undefined) {
            return;
        }
        if (tokens[idx] !== ":") {
            throw new LifetimePragmaParseError(
                pragma,
                `Expected ':', found '${pragma.tokens[idx]}'`,
            );
        }

        idx++;
        if (tokens.at(idx) === undefined) {
            throw new LifetimePragmaParseError(
                pragma,
                "Expected lifetime identifier after ':'",
            );
        }
        if (!LifetimeBoundPragma.isLifetimeIdentifier(tokens[idx])) {
            throw new LifetimePragmaParseError(
                pragma,
                `Expected lifetime identifier, found '${pragma.tokens[idx]}'`,
            );
        }
        this.bound = pragma.tokens[idx];
    }

    static parse(pragmas: CoralPragma[]): LifetimeBoundPragma[] {
        return pragmas
            .filter((p) => p.name === LifetimeBoundPragma.keyword)
            .map((p) => new LifetimeBoundPragma(p));
    }
}
