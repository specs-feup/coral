

export default class RegionckPipeline implements GraphTransformation {
    #debug: boolean;

    constructor(debug: boolean = false) {
        this.#debug = debug;
    }

    apply(graph: BaseGraph.Class): void {
        if (!graph.is(CoralGraph.TypeGuard)) {
            throw new Error("InScopeLoansComputation can only be applied to CoralGraphs");
        }

        const coralGraph = graph.as(CoralGraph.Class);

        for (const functionEntry of coralGraph.functions) {
            coralGraph
                .apply(new ConstraintGenerator(functionEntry, this.#debug))
                .apply(new InScopeLoansComputation(functionEntry))
                .apply(new RegionckErrorReporting());
        }
    }
}
