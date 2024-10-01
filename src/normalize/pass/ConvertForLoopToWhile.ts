import { Joinpoint, Loop } from "@specs-feup/clava/api/Joinpoints.js";
import ForToWhileStmt from "@specs-feup/clava/api/clava/code/ForToWhileStmt.js";
import CoralNormalizer from "coral/normalize/CoralNormalizer";
import Query from "@specs-feup/lara/api/weaver/Query.js";

export default class ConvertForLoopToWhile implements CoralNormalizer.Pass {
    labelCounter: number;
    #labelSuffix: string;

    constructor(labelCounter: number = 0, labelSuffix: string = "__coral_label_") {
        this.labelCounter = labelCounter;
        this.#labelSuffix = labelSuffix;
    }

    apply($jp: Joinpoint) {
        const forLoops = Query.searchFrom($jp, "loop", {
            kind: "for",
        });
        for (const $forLoop of forLoops) {
            ForToWhileStmt(
                $forLoop as Loop,
                `${this.#labelSuffix}${this.labelCounter}`,
            );
            this.labelCounter++;
        }
    }
}
