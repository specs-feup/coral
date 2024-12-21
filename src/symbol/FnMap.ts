import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import Fn from "@specs-feup/coral/mir/symbol/Fn";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/MetaRegionBound";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";
import LifetimeAssignmentPragma from "@specs-feup/coral/pragma/lifetime/LifetimeAssignmentPragma";
import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";


export default class FnMap {
    /**
     * Maps {@link FunctionJp} ids to their {@link Fn}.
     */
    #fnTable: Map<string, Fn>;

    constructor() {
        this.#fnTable = new Map();
    }

    get($decl: FunctionJp): Fn {
        const ty = this.#fnTable.get($decl.astId);
        if (ty !== undefined) {
            return ty;
        }

        // TODO take into account multiple declarations of the function

        const newFn = this.#parseFn($decl);
        this.#fnTable.set($decl.astId, newFn);
        return newFn;
    }

    #parseFn($fn: FunctionJp): Fn {
        const coralPragmas = CoralPragma.parse($fn.pragmas);

        const bounds = LifetimeBoundPragma.parse(coralPragmas)
            .filter((p) => p.bound !== undefined)
            .map((p) => new MetaRegionBound(p));
        
        const assignments = LifetimeAssignmentPragma.parse(coralPragmas);
        const lifetimeAssignments = new Map<string, LifetimeAssignmentPragma[]>();
        const lifetimes = new Set<string>();
        for (const assignment of assignments) {
            lifetimes.add(assignment.rhs);
            const relevantVar = lifetimeAssignments.get(assignment.lhs.varName);
            if (relevantVar === undefined) {
                lifetimeAssignments.set(assignment.lhs.varName, [assignment]);
            } else {
                relevantVar.push(assignment);
            }
        }
        
        const returnTy = this.#parseMetaType(
            $fn.returnType,
            lifetimeAssignments.get("return"),
            takenLifetimeNames,
            "return",
        );

        const paramTys = $fn.params.map($param => this.#parseMetaType(
            $param.type,
            lifetimeAssignments.get($param.name),
            takenLifetimeNames,
            $param.name,
        ));

        return new Fn($fn, bounds, lifetimes, paramTys, returnTy);
    }
}
