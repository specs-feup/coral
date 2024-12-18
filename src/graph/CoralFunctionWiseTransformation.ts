import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import CoralTransformation, { CoralTransformationApplier } from "@specs-feup/coral/graph/CoralTransformation";

export default abstract class CoralFunctionWiseTransformation<T = void> extends CoralTransformation<T> {
    get applier() {
        const fnApplier = this.fnApplier;
        return class extends CoralTransformationApplier<T> {
            apply(): void {
                for (const fn of this.graph.functionsToAnalyze) {
                    new fnApplier(this.graph, fn, this.args).apply();
                }
            }
        };
    }
    
    abstract get fnApplier(): new (graph: CoralGraph.Class, fn: CoralFunctionNode.Class, args: T) => CoralFunctionWiseTransformationApplier<T>;
}

export abstract class CoralFunctionWiseTransformationApplier<T = void> extends CoralTransformationApplier<T> {
    #fn: CoralFunctionNode.Class;

    get fn(): CoralFunctionNode.Class {
        return this.#fn;
    }

    constructor(graph: CoralGraph.Class, fn: CoralFunctionNode.Class, args: T) {
        super(graph, args);
        this.#fn = fn;
    }

    abstract apply(): void;
}
