laraImport("lara.pass.SimplePass");

laraImport("clava.graphs.ControlFlowGraph");
laraImport("clava.liveness.LivenessAnalysis");

class CoralAnalyser extends SimplePass {

    constructor() {
        super();
    }

    matchJoinPoint($jp) {
        return $jp.instanceOf("function") &&
            $jp.isImplementation;
    }

    transformJoinpoint($jp) {
        const cfg = ControlFlowGraph.build(root, true, true);
        console.log(cfg.toDot() + "\n\n");

        const liveness = LivenessAnalysis.analyse(cfg);
        const constraints = this.#defineConstraints($jp, cfg, liveness);
 
    }


    #defineConstraints($jp, cfg, liveness) {
        let constraints = [];

        
    }

}