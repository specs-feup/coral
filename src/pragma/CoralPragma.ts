import { Pragma } from "clava-js/api/Joinpoints.js";

export default class CoralPragma {
    static keyword: string = "coral";

    name: string;
    tokens: string[];
    $jp: Pragma;

    // Assumes that the pragma itself is a coral pragma
    constructor($jp: Pragma) {
        this.$jp = $jp;
        // Tokenize content into strings separated by whitespace
        // while removing the whitespace
        // Also tokenize special tokens: . = * -> ( ) :
        // This small lexer simplifies parsing the simple coral pragma language
        [this.name, ...this.tokens] = $jp.content
            .split(/(\s|\.|=|\*|->|\(|\)|:)/)
            .filter((token) => token.trim().length > 0);
        console.log([this.name, ...this.tokens]);
    }

    static parse(pragmas: Pragma[]): CoralPragma[] {
        return pragmas
            .filter(($pragma) => $pragma.name === CoralPragma.keyword)
            .map(($pragma) => new CoralPragma($pragma));
    }
}
