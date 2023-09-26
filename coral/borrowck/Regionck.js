laraImport("coral.borrowck.OutlivesConstraint");
laraImport("coral.dotFormatters.LivenessDotFormatter");
laraImport("coral.dotFormatters.MirDotFormatter");


laraImport("coral.borrowck.RegionVariable");
laraImport("coral.pass.CfgAnnotator");
laraImport("coral.pass.ConstraintGenerator");

laraImport("coral.graph.DataflowAnalysis");

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
    }


    mirToDotFile() {
        Io.writeFile("../out/dot/mir.gv", this.cfg.toDot(new MirDotFormatter()));
    }


    buildConstraints() {
        const constraintGenerator = new ConstraintGenerator(this);
        constraintGenerator.apply(this.$jp);

        return this;
    }

    infer() {
        let changed = true;
        while (changed) {
            changed = false;

            for (const constraint of this.constraints) {
                changed |= constraint.apply(this);
                constraint.apply(this);
            }
        }

        return this;
    }

    borrowCheck() {
        this.#calculateInScopeLoans();

        return this;
    }


    static _inScopeLoansTransferFn = (node) => {
        const scratch = node.scratch("_coral");
        const toAdd = new Set();
        const toKill = new Set();

        // Union of all incoming edges
        const inScopeLoans = new Set();
        for (const inNode of node.incomers().nodes()) {
            for (const loan of inNode.scratch("_coral").inScopeLoans) {
                inScopeLoans.add(loan);
            }
        }

        // Loans going out of scope
        for (const loan of inScopeLoans) {
            if (!loan.regionVar.points.has(node.id())) {
                toKill.add(loan);
            }
        }

        // New loan
        if (scratch.loan) {
            toAdd.add(scratch.loan);
        }

        // Check assignment paths
        if (scratch.assignment) {
            const prefixes = scratch.assignment.toPath.prefixes();
            for (const loan of inScopeLoans) {
                if (prefixes.some(prefix => loan.loanedPath.equals(prefix))) {
                    toKill.add(loan);
                }
            }
        }

        // Modify in-scope loans and check for changes
        for (const loan of toKill) {
            inScopeLoans.delete(loan);
        }
        for (const loan of toAdd) {
            inScopeLoans.add(loan);
        }

        let changed = false;
        if (inScopeLoans.size !== scratch.inScopeLoans.size) {
            changed = true;
        } else {
            for (const loan of scratch.inScopeLoans) {
                if (!inScopeLoans.has(loan)) {
                    changed = true;
                    break;
                }
            }
        }

        scratch.inScopeLoans = inScopeLoans;


        return changed;
    }


    #calculateInScopeLoans() {
        let changed = true;

        while (changed) {
            changed = DataflowAnalysis.transfer(this.cfg.startNode, Regionck._inScopeLoansTransferFn);
        }

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