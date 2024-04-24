import CoralPragma from "coral/pragma/CoralPragma";

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
        
        if (pragma.tokens.length === 3) {
            if (pragma.tokens[1] !== ":") {
                // TODO error
            }
            if (!LifetimeBoundPragma.isLifetimeIdentifier(pragma.tokens[2])) {
                // TODO error
            }
            this.bound = pragma.tokens[2];
        } else if (pragma.tokens.length !== 1) {
            // TODO error
        }

        if (!LifetimeBoundPragma.isLifetimeIdentifier(pragma.tokens[0])) {
            // TODO error
        }

        this.name = pragma.tokens[0];
    }

    static parse(pragmas: CoralPragma[]): LifetimeBoundPragma[] {
        return pragmas
            .filter((p) => p.name === LifetimeBoundPragma.keyword)
            .map((p) => new LifetimeBoundPragma(p));
    }
}
