import { Pragma } from "@specs-feup/clava/api/Joinpoints.js";

export default class CoralPragma {
    static keyword: string = "coral";

    name: string;
    tokens: string[];
    $jp: Pragma;


    constructor($jp: Pragma) {
        this.$jp = $jp;
 
        [this.name, ...this.tokens] = $jp.content
            .split(/(\s|\.|=|\*|->|\(|\)|:)/)
            .filter((token) => token.trim().length > 0);

        console.log(`[Lexer] Nome: ${this.name} | Tokens: ${this.tokens.join(', ')}`);
    }


    get isNullability(): boolean {
        return ["not-null", "maybe-null", "null"].includes(this.name);
    }

  
    get hasFinal(): boolean {
        return this.tokens.includes("final");
    }

 
    get target(): string {
        return this.tokens[this.tokens.length - 1];
    }

    isFlag(flag: string): boolean {
        // TODO instead of second condition, it should be an error
        return this.name === flag && this.tokens.length === 0;
    }

    static parse(pragmas: Pragma[]): CoralPragma[] {
        return pragmas
            .filter(($pragma) => $pragma.name === CoralPragma.keyword)
            .map(($pragma) => new CoralPragma($pragma));
    }
}
