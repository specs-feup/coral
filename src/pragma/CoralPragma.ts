import { Pragma } from "@specs-feup/clava/api/Joinpoints.js";

export default class CoralPragma {
    static keyword: string = "coral";

    readonly name: string;
    readonly tokens: string[];
    readonly $jp: Pragma;

    constructor($jp: Pragma) {
        this.$jp = $jp;

        const allTokens = $jp.content
            .split(/(\s|\.|=|\*|->|\(|\)|:)/)
            .map(t => t.trim())
            .filter(t => t.length > 0);

        this.name = allTokens[0] || "";
        this.tokens = allTokens.slice(1);
    }

    isFlag(flag: string): boolean {
        return this.name === flag && this.tokens.length === 0;
    }
    
    get isTransitionSyntax(): boolean {
        return this.tokens.includes(":");
    }

    get transitionData() {
        if (!this.isTransitionSyntax) return null;

        const content = this.$jp.content;
        const parts = content.split(':');
        const target = parts[0].trim();
        const flow = parts[1].split("->");

        return {
            target,
            entryPart: flow[0]?.trim() || "",
            exitPart: flow[1]?.trim() || ""
        };
    }

    static parse(pragmas: Pragma[]): CoralPragma[] {
        return pragmas
            .filter(($pragma) => $pragma.name === CoralPragma.keyword)
            .map(($pragma) => new CoralPragma($pragma));
    }
}