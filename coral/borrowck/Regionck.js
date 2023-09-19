laraImport("coral.borrowck.LifetimeConstraints");
laraImport("coral.borrowck.OutlivesConstraint");
laraImport("coral.dotFormatters.LivenessDotFormatter");

laraImport("coral.borrowck.RegionVariable");
laraImport("coral.pass.CfgAnnotator");

laraImport("clava.graphs.ControlFlowGraph");

class Regionck {

    jp;

    cfg;
    liveness;
    constraints;

    regions;
    loans;

    constructor($jp) {

        // println($jp.dump);
        this.constraints = [];
        this.regions = [];
        this.loans = [];

        this.$jp = $jp;
        this.cfg = ControlFlowGraph.build($jp, true, { splitInstList: true });
        // console.log(this.cfg.toDot() + "\n\n");

        this.liveness = LivenessAnalysis.analyse(this.cfg);
        // console.log(this.cfg.toDot(new LivenessDotFormatter(this.liveness)) + "\n\n");
        const cfgAnnotator = new CfgAnnotator(this);
        cfgAnnotator.apply($jp);

        // console.log(this.cfg.startNode.data().nodeStmt + "\n\n");
    }


    buildConstraints() {

    }

    infer() {
        
        return this;
    }
}