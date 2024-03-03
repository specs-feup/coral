laraImport("coral.error.CoralError");


class CodeLineHint {
    #$jp;
    #description;
    #line_ref;

    constructor($jp, description, $line_ref) {
        this.#$jp = $jp;
        this.#description = description;
        this.#line_ref = $line_ref;
    }

    toString(linePaddingSize) {
        const lineNum = (this.#line_ref.line?.toString() ?? "?").padStart(linePaddingSize, " ");

        let error = ` ${lineNum} |\t${this.#$jp.code}\n`;
        error += ` ${" ".repeat(linePaddingSize)} |\t\t${this.#description}\n`;

        return error;
    }
}


class ErrorMessageBuilder {
    #message;
    #main_line;
    #body;
    #lines;

    constructor(message, line) {
        this.#message = message;
        this.#main_line = line;
        this.#body = [];
        this.#lines = [];
    }

    code($jp, description = null, $line_ref = null) {
        if ($line_ref === null) {
            $line_ref = $jp;
        }
        this.#lines.push($line_ref.line);
        this.#body.push(new CodeLineHint($jp, description, $line_ref));
        return this;
    }

    toString() {
        const maxPaddingSize = Math.max(...this.#lines.map(l => l?.line ?? 1));
        const linePaddingSize = maxPaddingSize === maxPaddingSize ? maxPaddingSize.toString().length + 1 : 3;
        
        let error = `Error: ${this.#message}\n`;
        error += ` ${"-".repeat(linePaddingSize)}-> ${this.#main_line.filename ?? "unknown"}:${this.#main_line.line ?? "??"}\n`;
        error += ` ${" ".repeat(linePaddingSize)} |\n`;

        for (const line of this.#body) {
            error += line.toString(linePaddingSize);
        }

        return error;
    }
}
