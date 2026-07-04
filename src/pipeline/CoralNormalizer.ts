import { FunctionJp, Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Filter_WrapperVariant } from "@specs-feup/lara/api/weaver/Selector.js";
import SplitVarDecls from "@specs-feup/coral/pipeline/normalize/SplitVarDecls";
import ConvertForLoopToWhile from "@specs-feup/coral/pipeline/normalize/ConvertForLoopToWhile";
import SimplifyAssignments from "@specs-feup/coral/pipeline/normalize/SimplifyAssignments";
import AddAssignmentsToCallsAndBorrows from "@specs-feup/coral/pipeline/normalize/AddAssignmentsToCallsAndBorrows";
import SplitExpressions from "@specs-feup/coral/pipeline/normalize/SplitExpressions";
import Instrumentation from "@specs-feup/coral/instrumentation/Instrumentation";
import ExtractContracts from "./normalize/ExtractContracts.js";
import TransformSwitchToIf from "@specs-feup/clava/api/clava/pass/TransformSwitchToIf.js";
import ConvertSwitchToIf from "./normalize/ConvertSwitchToIf.js";

export class NormalizationContext {
    #varCounter: number;
    #labelCounter: number;
    #varPrefix: string;
    #labelPrefix: string;

    generateVarName() {
        return `${this.#varPrefix}${this.#varCounter++}`;
    }

    generateLabelName() {
        return `${this.#labelPrefix}${this.#labelCounter++}`;
    }

    constructor(varPrefix = "__coral_var_", labelPrefix = "__coral_label_") {
        this.#varCounter = 0;
        this.#labelCounter = 0;
        this.#varPrefix = varPrefix;
        this.#labelPrefix = labelPrefix;
    }
}

export default class CoralNormalizer {
    #instrumentation: Instrumentation;
    
    constructor(instrumentation: Instrumentation) {
        this.#instrumentation = instrumentation;
    }

    apply($fns: FunctionJp[]) {
        this.#instrumentation.pushCheckpoint("Normalization");

        if ($fns.length > 0) {
            const $parent = $fns[0].parent;
            new NormalizationApplier(new NormalizationContext(), $parent)
                .apply(new ExtractContracts());
        }

        for (const $fn of $fns) {
            new NormalizationApplier(new NormalizationContext(), $fn)
                .apply(new ConvertSwitchToIf())
                .apply(new ConvertForLoopToWhile())
                .apply(new SplitVarDecls())
                .apply(new SimplifyAssignments())
                .apply(new AddAssignmentsToCallsAndBorrows())
                .apply(new SplitExpressions());
        }
        this.#instrumentation.popCheckpoint();
    }
}

class NormalizationApplier {
    #context: NormalizationContext;
    #$jp: Joinpoint;
    constructor(context: NormalizationContext, $jp: Joinpoint) {
        this.#context = context;
        this.#$jp = $jp;
    }

    apply<T extends typeof Joinpoint>(pass: NormalizationPass<T>): this {
        const jpType = "jp" in pass.query ? pass.query.jp : pass.query;
        const jpFilter = "filter" in pass.query ? pass.query.filter : undefined;
        for (const $target of Query.searchFrom(this.#$jp, jpType, jpFilter)) {
            pass.apply($target, this.#context);
        }

        return this;
    }
}

export interface NormalizationPass<T extends typeof Joinpoint> {
    get query(): T | { jp: T, filter: Filter_WrapperVariant<T>};
    apply($jp: InstanceType<T>, context: NormalizationContext): void;
}
