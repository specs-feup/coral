laraImport("coral.regionck.OutlivesConstraint");

laraImport("coral.regionck.RegionVariable");
laraImport("coral.pass.CfgAnnotator");
laraImport("coral.pass.ConstraintGenerator");
laraImport("coral.pass.InScopeLoansComputation");
laraImport("coral.pass.RegionckErrorReporting");

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
        
        const cfgAnnotator = new CfgAnnotator(this);
        cfgAnnotator.apply($jp);
    }

    /**
     * @param {boolean} [printConstraintSet=false] If true, prints the constraint set
     */
    prepare(debug) {
        this.#buildConstraints();
        if (debug) {
            println("Initial Constraint Set:");
            println(this.aggregateRegionckInfo() + "\n\n");
        }
        this.#infer();
        this.#calculateInScopeLoans();
        if (debug) {
            println("After Inference:");
            println(this.aggregateRegionckInfo() + "\n\n");
        }
        return this;
    }


    #buildConstraints() {
        const constraintGenerator = new ConstraintGenerator(this);
        constraintGenerator.apply(this.$jp);

        return this;
    }

    #infer() {
        let changed = true;
        while (changed) {
            changed = false;

            for (const constraint of this.constraints) {
                changed |= constraint.apply(this);
            }
        }

        return this;
    }

    #calculateInScopeLoans() {
        let inScopeComputation = new InScopeLoansComputation(this.cfg.startNode);
        inScopeComputation.apply(this.$jp);
    }

    borrowCheck() {
        let errorReporting = new RegionckErrorReporting(this.cfg.startNode);
        errorReporting.apply(this.$jp);

        return this;
    }

    aggregateRegionckInfo() {
        let ret = "Regions:\n";
        for (const region of this.regions) {
            const points = Array.from(region.points).sort();
            ret += `\t'${region.name}: {${points.join(', ')}}\n`;
        }

        ret += "\nConstraints:\n";
        for (const constraint of this.constraints) {
            ret += `\t${constraint.toString()}\n`;
        }

        return ret;
    }
}
