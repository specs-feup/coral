laraImport("lara.pass.SimplePass");
laraImport("lara.pass.results.PassResult");

laraImport("clava.graphs.ControlFlowGraph");
laraImport("clava.liveness.LivenessAnalysis");

class CoralAnalyser extends SimplePass {

    get name() {
        return "CoralAnalyser";
    }

    constructor() {
        super();
    }

    matchJoinpoint($jp) {
        return $jp.instanceOf("function") &&
            $jp.isImplementation;
    }

    transformJoinpoint($jp) {
        const cfg = ControlFlowGraph.build($jp, true, true);
        console.log(cfg.toDot() + "\n\n");

        const liveness = LivenessAnalysis.analyse(cfg);
        const constraints = this.#defineConstraints($jp, cfg, liveness);
 
        return new PassResult(this, $jp, {applied: false});
    }


    #defineConstraints($jp, cfg, liveness) {
        let constraints = [];

        
    }

}