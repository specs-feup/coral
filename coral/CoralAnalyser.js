laraImport("lara.pass.SimplePass");
laraImport("lara.pass.results.PassResult");
laraImport("clava.graphs.ControlFlowGraph");
laraImport("clava.liveness.LivenessAnalysis");

laraImport("coral.borrowck.Regionck");

class CoralAnalyser extends SimplePass {

    get name() {
        return "CoralAnalyser";
    }

    constructor() {
        super();
    }

    matchJoinpoint($jp) {
        return $jp.instanceOf("function") && $jp.name === "main" &&
            $jp.isImplementation;
    }

    transformJoinpoint($jp) {
        const regionck = new Regionck($jp);
        regionck.buildConstraints().infer();
        return new PassResult(this, $jp);
    }

}