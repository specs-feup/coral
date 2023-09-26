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
laraImport("coral.ty.BorrowKind");


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
        const successor = node.connectedEdges().filter(e => e.source().id() === node.id()).map(e => e.target().id());
        // println(`node ${node.id()} has [${successor.join(', ')}] successors`);
        if ((successor.length != 1) && (scratch.loan || scratch.assignments?.length > 0)) {
            throw new Error(`subtypingConstraints: node ${node.id()} has ${successor.length} successors and a loan/assignment`);
        }

        if (scratch.loan) {
            this.#relateTy(scratch.loan.leftTy, scratch.loan.loanedRefTy, Variance.CO, successor[0]);
        } else if (scratch.assignments.length > 0) {
            for (const assignment of scratch.assignments) {
                this.#relateTy(assignment.leftTy, assignment.rightTy, Variance.CO, successor[0]);
            }
        }
    }


    /**
     * 
     * @param {Ty} ty1 
     * @param {Ty} ty2 
     * @param {Variance} variance 
     * @param {string} successor
     */
    #relateTy(ty1, ty2, variance, successor) {
        if (ty1 instanceof RefTy && ty2 instanceof RefTy) {
            this.#relateRegions(ty1.regionVar, ty2.regionVar, Variance.xform(variance, Variance.CO), successor);
            this.#relateTy(ty1.referent, ty2.referent, Variance.xform(variance, ty1.borrowKind == BorrowKind.MUTABLE ? Variance.IN : Variance.CO));
            return;
        }

        if (ty1 instanceof ElaboratedTy && ty2 instanceof ElaboratedTy) {
            if (ty1.kind != ty2.kind || ty1.name != ty2.name) { 
                throw new Error(`Cannot relate types ${ty1.toString()} and ${ty2.toString()}, different kinds or names`);
            }
            if (ty1.lifetimes.length != ty2.lifetimes.length) {
                throw new Error(`Cannot relate types ${ty1.toString()} and ${ty2.toString()}, different number of lifetimes`);
            }

            for (let i = 0; i < ty1.lifetimes.length; i++) {
                // TODO: May need to be changed to go parameter by paramenter, which would require changes to the ElaboratedTy
                this.#relateRegions(ty1.lifetimes[i], ty2.lifetimes[i], Variance.xform(variance, Variance.IN), successor);
            }
            
            return;
        }
        
        if (ty1 instanceof BuiltinTy && ty2 instanceof BuiltinTy) {
            return;
        }

        throw new Error(`Cannot relate types ${ty1.toString()} and ${ty2.toString()}`);        
    }

    /**
     * 
     * @param {RegionVariable} region1
     * @param {RegionVariable} region2 
     * @param {Variance} variance 
     * @param {string} successor
     */
    #relateRegions(region1, region2, variance, successor) {
        switch (variance) {
            case Variance.CO: // "a Co b" == "a <= b"
                this.constraints.push(new OutlivesConstraint(region2, region1, successor));
                break;
            case Variance.CONTRA: // "a Contra b" == "a >= b"
                this.constraints.push(new OutlivesConstraint(region1, region2, successor));
                break;
            case Variance.IN: // "a In b" == "a == b"
                this.constraints.push(new OutlivesConstraint(region2, region1, successor));
                this.constraints.push(new OutlivesConstraint(region1, region2, successor));
                break;
        }
    }
    

    #reborrowConstraints(node) {
        // TODO: REBORROW CONSTRAINTS
    }
}