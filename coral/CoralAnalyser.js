laraImport("lara.pass.SimplePass");
laraImport("lara.pass.results.PassResult");
laraImport("clava.graphs.ControlFlowGraph");
laraImport("clava.liveness.LivenessAnalysis");

laraImport("coral.regionck.Regionck");

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
        const regionck = new Regionck($jp).prepare(true);

        regionck.mirToDotFile();
        println("After Inference:");
        println(regionck.aggregateRegionckInfo() + "\n\n");

        regionck.borrowCheck();

        return new PassResult(this, $jp);
    }

}
