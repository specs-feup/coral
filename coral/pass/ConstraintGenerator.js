import Query from "lara-js/api/weaver/Query.js";
import Pass from "lara-js/api/lara/pass/Pass.js";


import OutlivesConstraint from "../borrowck/OutlivesConstraint.js";
import RegionKind from "../borrowck/RegionKind.js";
import RegionVariable from "../borrowck/RegionVariable.js";
import Regionck from "../borrowck/Regionck.js";

import Ty from "../ty/Ty.js";
import RefTy from "../ty/RefTy.js";
import BuiltinTy from "../ty/BuiltinTy.js";
import ElaboratedTy from "../ty/ElaboratedTy.js";
import Variance from "../ty/Variance.js";
import BorrowKind from "../ty/BorrowKind.js";
import { Joinpoint } from "clava-js/api/Joinpoints.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";
import PathVarRef from "../mir/path/PathVarRef.js";
import PathDeref from "../mir/path/PathDeref.js";


export default class ConstraintGenerator extends Pass {
    
    _name = "ConstraintGenerator";

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
     * @param {Joinpoint} $jp 
     * @returns {PassResult}
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
            const successors = node.outgoers().nodes().map(e => e.id());
            if ((successors.length != 1) && (scratch.loan || scratch.assignments?.length > 0)) {
                throw new Error(`ConstraintGenerator: node ${node.id()} has ${successors.length} successors and a loan/assignment`);
            }

            this.#subtypingConstraints(node, successors[0]);
            this.#reborrowConstraints(node, successors[0]);
        }

        return new PassResult(this, $jp);
    }


    #subtypingConstraints(node, successor) {
        // TODO: Missing constraints from parameters (maybe can be covered though assignment w/ proper annotations?)
        const scratch = node.scratch("_coral");

        if (scratch.loan) {
            this.#relateTy(scratch.loan.leftTy, scratch.loan.loanedRefTy, Variance.CO, successor);
        } else {
            for (const assignment of scratch.assignments) {
                this.#relateTy(assignment.leftTy, assignment.rightTy, Variance.CONTRA, successor);
            }
        }
    }

    #reborrowConstraints(node, successor) {
        const scratch = node.scratch("_coral");
        if (scratch.reborrow === undefined) {
            return;
        }

        if (scratch.loan === undefined) {
            throw new Error("reborrowConstraints: reborrow without loan");
        }

        for (const path of scratch.loan.loanedPath.supportingPrefixes()) {
            if (!(path instanceof PathDeref))
                continue;
            
            this.#relateRegions(path.regionVar, scratch.loan.regionVar, Variance.CONTRA, successor);                
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
            this.#relateTy(ty1.referent, ty2.referent, Variance.xform(variance, ty1.borrowKind == BorrowKind.MUTABLE ? Variance.IN : Variance.CO), successor);
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
    
}