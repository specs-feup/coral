import { Pragma } from "@specs-feup/clava/api/Joinpoints.js";

export default class CoralPragma {
    static keyword: string = "coral";

    readonly name: string;
    readonly tokens: string[];
    readonly $jp: Pragma;
    readonly rawContent: string; 

    constructor($jp: Pragma) {
        this.$jp = $jp;
        this.rawContent = $jp.content;

        const allTokens = this.rawContent
            .split(/(\s|\.|=|\*|->|\(|\)|:)/)
            .map(t => t.trim())
            .filter(t => t.length > 0);

        this.name = allTokens[0] || "";
        this.tokens = allTokens.slice(1);
    }

    isFlag(flag: string): boolean {
        return this.name === flag && this.tokens.length === 0;
    }

    static parse(pragmas: Pragma[]): CoralPragma[] {
        return pragmas
            .filter(($pragma) => $pragma.name === CoralPragma.keyword)
            .map(($pragma) => new CoralPragma($pragma));
    }
}