laraImport("lara.graphs.DotFormatter");
laraImport("clava.graphs.ControlFlowGraph");

class MirDotFormatter extends DotFormatter {

    constructor() {
        super();

        this.setNodeLabelFormatter((node) => {
            return node.data().toString();
        });

        this.setEdgeLabelFormatter((edge) => {
            const sections = new Map();

            const from = edge.source();
            const scratch = from.scratch("_coral");
            
            if (scratch.loan !== undefined) {
                sections.set("Loan", scratch.loan.toString() + "\n");
            }

            const accesses = scratch.accesses;
            if (accesses.length > 0) {
                sections.set("Accesses", accesses.map(a => a.toString()).join("\n"));
            }


            let ret = "";
            for (const [key, value] of sections) {
                ret += `${key}:\n${value}\n`
            }
            return ret;
        });
    }

}