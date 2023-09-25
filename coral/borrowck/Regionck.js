laraImport("coral.borrowck.OutlivesConstraint");
laraImport("coral.dotFormatters.LivenessDotFormatter");
laraImport("coral.dotFormatters.MirDotFormatter");


laraImport("coral.borrowck.RegionVariable");
laraImport("coral.pass.CfgAnnotator");
laraImport("coral.pass.ConstraintGenerator");

laraImport("clava.graphs.ControlFlowGraph");

laraImport("lara.Io");

class Regionck {

    /**
     * @type {JoinPoint} Function JoinPoint
     */
    jp;
    /**
     * @type {ControlFlowGraph}
     */
    cfg;
    /**
     * @type {LivenessAnalysis}
     */
    liveness;
    /**
     * @type {OutlivesConstraint[]}
     */
    constraints;

    regions;
    /**
     * @type {Loan[]}
     */
    loans;

    /**
     * @type {Map<string, Ty>}
     */
    declarations;

    constructor($jp) {
        this.constraints = [];
        this.regions = [];
        this.loans = [];
        this.declarations = new Map();

        this.$jp = $jp;
        this.cfg = ControlFlowGraph.build($jp, true, { splitInstList: true });

        this.liveness = LivenessAnalysis.analyse(this.cfg);
        // console.log(this.cfg.toDot(new LivenessDotFormatter(this.liveness)) + "\n\n");
        
        const cfgAnnotator = new CfgAnnotator(this);
        cfgAnnotator.apply($jp);

        Io.writeFile("../out/dot/mir.gv", this.cfg.toDot(new MirDotFormatter()));
    }


    buildConstraints() {
        const constraintGenerator = new ConstraintGenerator(this);
        constraintGenerator.apply(this.$jp);

        println(this.aggregateRegionckInfo());

        return this;
    }

    infer() {
        
        return this;
    }

    aggregateRegionckInfo() {
        let ret = "Regions:\n";
        for (const region of this.regions) {
            const points = Array.from(region.points).sort();
            ret += `\t'${region.name}: {${points.join(', ')}}\n`;
        }

        // ret += "\nConstraints:\n";
        // for (const constraint of this.constraints) {
        //     ret += `\t${constraint}\n`;
        // }

        return ret;
    }
}