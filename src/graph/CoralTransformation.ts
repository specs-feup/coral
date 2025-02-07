import ClavaFlowDotFormatter from "@specs-feup/clava-flow/dot/ClavaFlowDotFormatter";
import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import Graph from "@specs-feup/flow/graph/Graph";

export default abstract class CoralTransformation<T = void>
    implements Graph.Transformation<CoralGraph.Class, CoralGraph.Class>
{
    #args: T;
    abstract get applier(): new (graph: CoralGraph.Class, args: T) => CoralTransformationApplier<T>;

    constructor(args: T) {
        this.#args = args;
    }
    
    apply(graph: CoralGraph.Class): CoralGraph.Class {
        graph.instrumentation.pushCheckpoint(this.constructor.name);
        new this.applier(graph, this.#args).apply();
        const checkpoint = graph.instrumentation.popCheckpoint();
        if (graph.isDebug && checkpoint.isLeaf) {
            graph.toFile(
                new ClavaFlowDotFormatter(),
                checkpoint.dotFilePath,
            );
        }
        
        return graph;
    }
}

export abstract class CoralTransformationApplier<T = void> {
    #graph: CoralGraph.Class;
    #args: T;

    get graph(): CoralGraph.Class {
        return this.#graph;
    }

    get args(): T {
        return this.#args;
    }

    constructor(graph: CoralGraph.Class, args: T) {
        this.#graph = graph;
        this.#args = args;
    }

    abstract apply(): void;
}
