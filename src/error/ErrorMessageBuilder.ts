import { Decl, Joinpoint, Statement } from "@specs-feup/clava/api/Joinpoints.js";

class CodeLineHint {
    #jpCode: string;
    #description: string | undefined;
    #line?: number;

    constructor(jpCode: string, description: string | undefined, $line?: number) {
        this.#jpCode = jpCode;
        this.#description = description;
        this.#line = $line;
    }

    toString(linePaddingSize: number) {
        let error = "";
        let currentLine = this.#line;
        for (const jpCodeLine of this.#jpCode.replace("\r", "").split("\n")) {
            if (jpCodeLine === "") {
                continue;
            }

            const lineNum = (currentLine?.toString() ?? "").padStart(linePaddingSize, " ");
            error += ` ${lineNum} |\t${jpCodeLine}\n`;
            if (currentLine !== undefined) {
                currentLine++;
            }
        }

        if (error === "") {
            error += ` ${" ".repeat(linePaddingSize)} |\t\n`;
        }

        if (this.#description !== undefined) {
            error += ` ${" ".repeat(linePaddingSize)} |\t\t|> ${this.#description}\n`;
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
        this.#$main_line_ref = $line_ref.originNode;
        this.#body = [];
        this.#lines = [];
    }

    code(
        $jp: Joinpoint,
        description: string | undefined = undefined,
        $line_ref: Joinpoint | undefined = undefined,
    ) {
        if ($line_ref === undefined) {
            $line_ref = $jp;
        }
        this.#lines.push($line_ref.line ?? 1);
        
        while (!($jp instanceof Statement || $jp instanceof Decl)) {
            if ($jp.parent === undefined) {
                break;
            }
            $jp = $jp.parent;
        }

        this.#body.push(new CodeLineHint($jp.originNode.code, description, $line_ref.originNode.line));
        return this;
    }

    codeString(
        jpCode: string,
        description: string | undefined = undefined,
        line: number,
    ) {
        this.#lines.push(line);
        this.#body.push(new CodeLineHint(jpCode, description, line));
        return this;
    }

    blankLine() {
        this.#body.push(new CodeLineHint("", undefined));
        return this;
    }

    ellipsis() {
        this.#body.push(new CodeLineHint("...", undefined));
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
