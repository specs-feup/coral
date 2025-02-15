import { CoralConfig } from "@specs-feup/coral/Coral";
import Logger from "@specs-feup/coral/instrumentation/Logger";
import { duration_unit, memory_unit } from "@specs-feup/coral/instrumentation/Units";
import System from "@specs-feup/lara/api/lara/System.js";
import ansiColors from "ansi-colors";
import fs from "fs";

interface CheckpointResult {
    endTime: number;
    memoryUsage: NodeJS.MemoryUsage;
}

interface CheckpointJson {
    name: string;
    start_time: number;
    end_time?: number;
    memory_usage?: NodeJS.MemoryUsage;
    children: CheckpointJson[];
}

class Checkpoint {
    #name: string;
    #indices: number[];
    #children: Checkpoint[];
    #startTime: number;
    #result: CheckpointResult | undefined;
    #logger: Logger;

    constructor(name: string, logger: Logger, indices: number[] = []) {
        this.#name = name;
        this.#logger = logger;
        this.#indices = indices;
        this.#children = [];
        this.#startTime = System.nanos();
        this.#result = undefined;
    }

    toJson(): CheckpointJson {
        return {
            name: this.#name,
            start_time: this.#startTime,
            end_time: this.#result?.endTime,
            memory_usage: this.#result?.memoryUsage,
            children: this.#children.map((child) => child.toJson()),
        }
    }

    pushCheckpoint(name: string): Checkpoint {
        if (this.#children.length <= 0 || this.#children[this.#children.length - 1].isFinished) {
            const newIndices = this.#indices.concat([this.#children.length + 1]);
            const newCheckpoint = new Checkpoint(name, this.#logger, newIndices);
            this.#children.push(newCheckpoint);
            return newCheckpoint;
        } else {
            return this.#children[this.#children.length - 1].pushCheckpoint(name);
        }
    }

    popCheckpoint(): Checkpoint {
        if (this.#children.length <= 0 || this.#children[this.#children.length - 1].isFinished) {
            this.#result = {
                endTime: System.nanos(),
                memoryUsage: process.memoryUsage(),
            }
            return this;
        } else {
            return this.#children[this.#children.length - 1].popCheckpoint();
        }
    }

    logIntroduce() {
        const indentation = "  ".repeat(this.depth - 1);
        const index = ansiColors.bold.gray(this.#indices.join('.'));
        this.#logger.log(`${indentation}${index} ${this.#name}`);
    }

    logResults() {
        if (this.#result === undefined) {
            throw new Error("Cannot log results of unfinished checkpoint");
        }
        const time = duration_unit(this.#result.endTime - this.#startTime);
        const memory = memory_unit(this.#result.memoryUsage.heapUsed);
        const indentation = "  ".repeat(this.depth);
        const bar = ansiColors.gray("|");
        this.#logger.log(ansiColors.white.dim(`${indentation}${bar} time: ${time}  mem: ${memory}`));
    }

    get currentTime() {
        return duration_unit(System.nanos() - this.#startTime);
    }

    get isLeaf() {
        return this.#children.length === 0;
    }

    get isFinished() {
        return this.#result !== undefined;
    }

    get depth() {
        return this.#indices.length;
    }

    get dotFilePath() {
        const index = this.#indices.join("_");
        return this.#logger.debugDir + `/graph/${index}_${this.#name}.dot`;
    }
}

export default class Instrumentation {
    #config: CoralConfig;
    #rootCheckpoint: Checkpoint;
    #logger: Logger;

    constructor(config: CoralConfig) {
        this.#config = config;
        this.#logger = new Logger(config);
        this.#rootCheckpoint = new Checkpoint("root", this.#logger);
    }

    pushCheckpoint(name: string) {
        const checkpoint = this.#rootCheckpoint.pushCheckpoint(name);
        checkpoint.logIntroduce();
    }

    popCheckpoint() {
        const checkpoint = this.#rootCheckpoint.popCheckpoint();
        checkpoint.logResults();

        if (this.#config.debug && this.#config.instrumentation) {
            this.saveCheckpoints();
        }
        return checkpoint;
    }

    log(...message: any[]) {
        this.#logger.log(...message);
    }

    logDebug(...message: any[]) {
        this.#logger.logDebug(...message);
    }

    get debugDir() {
        return this.#logger.debugDir;
    }

    saveCheckpoints() {
        const json = this.#rootCheckpoint.toJson();
        fs.writeFileSync(this.#logger.debugDir + "/instrumentation.json", JSON.stringify(json, null, 4));
    }

    printTotalTime() {
        const time = this.#rootCheckpoint.currentTime;
        this.#logger.log(`Total execution time was ${time}.`);
    }
}
