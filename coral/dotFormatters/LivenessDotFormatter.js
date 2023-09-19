laraImport("lara.graphs.DotFormatter");
laraImport("clava.graphs.ControlFlowGraph");
laraImport("clava.liveness.LivenessAnalysis");

class LivenessDotFormatter extends DotFormatter {

    constructor(liveness) {
        super();

        this.setEdgeLabelFormatter((edge) => {
            const from = edge.source().id();
            return Array.from(liveness.liveOut.get(from)).join(' ');
        });
    }

}