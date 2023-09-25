laraImport("lara.graphs.DotFormatter");
laraImport("clava.graphs.ControlFlowGraph");
laraImport("clava.graphs.cfg.CfgNodeType");

class MirDotFormatter extends DotFormatter {

    constructor() {
        super();

        this.setNodeLabelFormatter((node) => {
            return `[${node.id()}] ${node.data().toString()}`;
        });

        this.setEdgeLabelFormatter((edge) => {
            const sections = new Map();

            const from = edge.source();
            const scratch = from.scratch("_coral");
            
            if (scratch.lhs_ty?.requiresLifetimes) {
                sections.set("Ty Lifetimes", scratch.lhs_ty.toString() + "\n");
            }

            if (scratch.loan !== undefined) {
                sections.set("Loan", scratch.loan.toString() + "\n");
            }

            if (scratch.accesses.length > 0) {
                sections.set("Accesses", scratch.accesses.map(a => a.toString()).join("\n") + "\n");
            }

            if (scratch.assignments.length > 0) {
                sections.set("Assignments", scratch.assignments.join("\n") + "\n");
            }

            let ret = "";
            for (const [key, value] of sections) {
                ret += `${key}:\n${value}\n`
            }
            return ret;
        });
    }

}