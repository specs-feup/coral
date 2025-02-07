import { CoralConfig } from "@specs-feup/coral/Coral";
import fs from "fs";

export default class Logger {
    #config: CoralConfig;
    constructor(config: CoralConfig) {
        this.#config = config;
        fs.rmSync(this.debugDir, { recursive: true, force: true });
        if (this.#config.debug || this.#config.instrumentation) {
            fs.mkdirSync(this.debugDir, { recursive: true });
        }
        if (this.#config.debug) {
            fs.mkdirSync(this.debugDir + "/graph", { recursive: true });
        }
    }

    get debugDir() {
        return this.#config.outDir + "/debug";
    }

    log(...message: any[]) {
        if (this.#config.verbose) {
            console.log(...message);
        }
        if (this.#config.debug) {
            const time = new Date().toISOString();
            const fileMessage = message
                .map((m) => typeof m === 'object' ? JSON.stringify(m, null, 4) : String(m))
                .join(" ")
                // remove any ansi color codes from the message
                .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
            
            fs.appendFileSync(this.debugDir + "/log.txt", `[${time}] ${fileMessage}\n`);
        }
    }

    logDebug(...message: any[]) {
        if (this.#config.debug) {
            this.log(...message);
        }
    }
}

// process.stdout.moveCursor(0, -1); // move cursor up one line
// process.stdout.clearLine(0); // clear current text
// process.stdout.cursorTo(0); // move cursor to beginning of line
        