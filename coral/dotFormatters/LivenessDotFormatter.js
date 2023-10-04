import DotFormatter from "lara-js/api/lara/graphs/DotFormatter.js";
import ControlFlowGraph from "clava-js/api/clava/graphs/ControlFlowGraph.js";
import LivenessAnalysis from "clava-js/api/clava/liveness/LivenessAnalysis.js";

export default class LivenessDotFormatter extends DotFormatter {

    constructor(liveness) {
        super();

        this.setEdgeLabelFormatter((edge) => {
            const from = edge.source().id();
            return Array.from(liveness.liveOut.get(from)).join(' ');
        });
    }

}