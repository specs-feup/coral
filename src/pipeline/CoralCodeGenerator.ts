import CoralGraph from "@specs-feup/coral/graph/CoralGraph";
import AddLifetimePragmas from "@specs-feup/coral/pipeline/generate/AddLifetimePragmas";
import DropElaboration from "@specs-feup/coral/pipeline/generate/DropElaboration";


export default class CoralCodeGenerator {
    #graph: CoralGraph.Class;

    constructor(graph: CoralGraph.Class) {
        this.#graph = graph;
    }

    apply() {
        this.#graph.instrumentation.pushCheckpoint("C Code Generation");
        this.#graph
            .apply(new DropElaboration())
            .apply(new AddLifetimePragmas());
        this.#graph.instrumentation.popCheckpoint();
    }
}
