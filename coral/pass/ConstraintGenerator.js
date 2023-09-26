laraImport("lara.pass.Pass");
laraImport("weaver.Query");

laraImport("coral.borrowck.OutlivesConstraint");
laraImport("coral.ty.RefTy");
laraImport("coral.borrowck.RegionKind");
laraImport("coral.borrowck.RegionVariable");
laraImport("coral.borrowck.Regionck");

laraImport("coral.ty.Ty");
laraImport("coral.ty.RefTy");
laraImport("coral.ty.BuiltinTy");
laraImport("coral.ty.ElaboratedTy");
laraImport("coral.ty.Variance");


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
                for (const region of ty.nestedLifetimes()) {
                    region.points.add(node.id());
                }
            }

            // Other constraints
            this.#subtypingConstraints(node);
            this.#reborrowConstraints(node);
        }

    }


    #subtypingConstraints(node) {
        // TODO: Missing constraints from parameters (maybe can be covered though assignment w/ proper annotations?)
        const scratch = node.scratch("_coral");
        if (scratch.loan) {
            this.#relateTy(scratch.loan.leftTy, scratch.loan.loanedRefTy, Variance.CO);
        } else if (scratch.assignments.len > 0) {
            for (const assignment of scratch.assignments) {
                this.#relateTy(assignment.leftTy, assignment.rightTy, Variance.CO);
            }
        }
    }


    /**
     * 
     * @param {Ty} ty1 
     * @param {Ty} ty2 
     * @param {Variance} variance 
     */
    #relateTy(ty1, ty2, variance) {
        if (ty1.constructor !== ty2.constructor)
            throw new Error(`Cannot relate types ${ty1.toString()} and ${ty2.toString()}`);

        // TODO:
    }
    

    #reborrowConstraints(node) {
        // TODO: REBORROW CONSTRAINTS
    }
}