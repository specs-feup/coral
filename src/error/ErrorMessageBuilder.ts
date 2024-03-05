import { Joinpoint } from "clava-js/api/Joinpoints.js";

class CodeLineHint {
    #$jp: Joinpoint;
    #description: string | null;
    #line_ref: Joinpoint;

    constructor($jp: Joinpoint, description: string | null, $line_ref: Joinpoint) {
        this.#$jp = $jp;
        this.#description = description;
        this.#line_ref = $line_ref;
    }

    toString(linePaddingSize: number) {
        const lineNum = (this.#line_ref.line?.toString() ?? "?").padStart(
            linePaddingSize,
            " ",
        );

        let error = ` ${lineNum} |\t${this.#$jp.code}\n`;
        if (this.#description !== null) {
            error += ` ${" ".repeat(linePaddingSize)} |\t\t${this.#description}\n`;
        }

        return error;
    }
}

export default class ErrorMessageBuilder {
    #message: string;
    #$main_line_ref: Joinpoint;
    #body: CodeLineHint[];
    #lines: number[];

    constructor(message: string, $line_ref: Joinpoint) {
        this.#message = message;
        this.#$main_line_ref = $line_ref;
        this.#body = [];
        this.#lines = [];
    }

    code(
        $jp: Joinpoint,
        description: string | null = null,
        $line_ref: Joinpoint | null = null,
    ) {
        if ($line_ref === null) {
            $line_ref = $jp;
        }
        this.#lines.push($line_ref.line ?? 1);
        this.#body.push(new CodeLineHint($jp, description, $line_ref));
        return this;
    }

    toString() {
        const maxPaddingSize = Math.max(...this.#lines);
        const linePaddingSize =
            maxPaddingSize === maxPaddingSize ? maxPaddingSize.toString().length + 1 : 3;

        let error = `Error: ${this.#message}\n`;
        error += ` ${"-".repeat(linePaddingSize)}-> ${this.#$main_line_ref.filename ?? "unknown"}:${this.#$main_line_ref.line ?? "??"}\n`;
        error += ` ${" ".repeat(linePaddingSize)} |\n`;

        for (const line of this.#body) {
            error += line.toString(linePaddingSize);
        }

        return error;
    }
}
