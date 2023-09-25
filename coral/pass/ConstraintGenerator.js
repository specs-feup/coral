laraImport("lara.pass.Pass");
laraImport("weaver.Query");

laraImport("coral.borrowck.OutlivesConstraint");
laraImport("coral.ty.RefTy");
laraImport("coral.borrowck.RegionKind");
laraImport("coral.borrowck.RegionVariable");
laraImport("coral.borrowck.Regionck");

class ConstraintGenerator extends Pass {
    
    /**
     * @type {Regionck}
     */
    borrowck;
    
    /**
     * @type {OutlivesConstraint[]}
     */
    constraints;

    /**
     * 
     * @param {Regionck} borrowck 
     */
    constructor(borrowck) {
        super();
        this.borrowck = borrowck;
        this.borrowck.constraints = [];
        this.constraints = this.borrowck.constraints;
    }

    /**
     * 
     * @param {JoinPoint} $jp 
     */
    _apply_impl($jp) {
        const universal = this.borrowck.regions.filter(r => r.kind === RegionKind.UNIVERSAL);
        universal.forEach(region => {
            region.points.add(`end(${region.name})`);
        });

        for (const node of this.borrowck.cfg.graph.nodes()) {
            const scratch = node.scratch("_coral");

            // Insert CFG into universal regions
            for (const region of universal) {
                region.points.add(node.id());
            }

            // Lifetime constraints
            for (const variable of scratch.liveIn.keys()) {
                const ty = this.borrowck.declarations.get(variable);
                if (ty instanceof RefTy && ty.regionVar.kind === RegionKind.EXISTENTIAL) {
                    ty.regionVar.points.add(node.id());
                }
            }

            // Other constraints
            this.#subtypingConstraints(node);
            this.#reborrowConstraints(node);
        }

    }


    #subtypingConstraints(node) {
        const scratch = node.scratch("_coral");
        if (scratch.loan) {
            const loan = scratch.loan;
            
        }
    }

    #reborrowConstraints(node) {
        // TODO: REBORROW CONSTRAINTS
    }
}