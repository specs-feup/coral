import { FunctionJp } from "@specs-feup/clava/api/Joinpoints.js";
import Fn, { FnParam } from "@specs-feup/coral/mir/symbol/Fn";
import MetaRegion from "@specs-feup/coral/mir/symbol/region/meta/MetaRegion";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/region/meta/MetaRegionBound";
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";
import { alphabeticMetaRegionGenerator, MetaRegionMapper } from "@specs-feup/coral/mir/symbol/ty/meta/MetaTyParser";
import CoralPragma from "@specs-feup/coral/pragma/CoralPragma";
import LifetimeAssignmentPragma from "@specs-feup/coral/pragma/lifetime/LifetimeAssignmentPragma";
import LifetimeBoundPragma from "@specs-feup/coral/pragma/lifetime/LifetimeBoundPragma";
import DefMap from "@specs-feup/coral/symbol/DefMap";


export default class FnMap {
    /**
     * Maps {@link FunctionJp} ids to their {@link Fn}.
     */
    #fnTable: Map<string, Fn>;
    #defMap: DefMap;

    constructor(defMap: DefMap) {
        this.#fnTable = new Map();
        this.#defMap = defMap;
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


        const boundsOrDecl = LifetimeBoundPragma.parse(coralPragmas);
        const bounds = boundsOrDecl
            .filter((p) => p.bound !== undefined)
            .map(MetaRegionBound.fromPragma);
        
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
        const metaRegions = Array.from(lifetimes).map((lifetime) => new MetaRegion(lifetime));
        
        
        const regionNameGenerator = alphabeticMetaRegionGenerator(lifetimes);
        // TODO new pragma Lhs is "return", for codegen
        const returnTy = MetaTy.parse($fn.returnType, new MetaRegionMapper(
            lifetimeAssignments.get("return") ?? [],
            regionNameGenerator,
        ), this.#defMap);

        // TODO new pragma lhs is $param.name, for codegen
        const params = $fn.params.map($param => new FnParam($param, MetaTy.parse($param.type, new MetaRegionMapper(
            lifetimeAssignments.get($param.name) ?? [],
            regionNameGenerator,
        ), this.#defMap)));

        const hasLifetimePragmas = boundsOrDecl.length > 0 || assignments.length > 0;

        return new Fn($fn, bounds, metaRegions, returnTy, params, hasLifetimePragmas);
    }
}
