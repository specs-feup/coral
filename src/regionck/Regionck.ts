import { Vardecl } from "clava-js/api/Joinpoints.js";
import Ty from "coral/mir/ty/Ty";
import OutlivesConstraint from "coral/regionck/OutlivesConstraint";
import RegionVariable from "coral/regionck/RegionVariable";
import FunctionEntryNode from "clava-flow/flow/node/instruction/FunctionEntryNode";
import StructDefsMap from "coral/regionck/StructDefsMap";

export default class Regionck {
    functionEntry: FunctionEntryNode.Class;
    constraints: OutlivesConstraint[];
    structDefs: StructDefsMap;
    #regionVars: RegionVariable[];
    #symbolTable: Map<string, Ty>;

    constructor(functionEntry: FunctionEntryNode.Class, structDefs: StructDefsMap) {
        this.constraints = [];
        this.#regionVars = [];
        this.structDefs = structDefs;
        this.#symbolTable = new Map();
        this.functionEntry = functionEntry;
    }

    getTy($varDecl: Vardecl): Ty | undefined {
        return this.#symbolTable.get($varDecl.astId);
    }

    registerTy($varDecl: Vardecl, ty: Ty): void {
        this.#symbolTable.set($varDecl.astId, ty);
    }

    newRegionVar(kind: RegionVariable.Kind, name?: string): RegionVariable {
        const id = this.#regionVars.length;
        const regionVar = new RegionVariable(
            id.toString(),
            kind,
            name ? name : id.toString(),
        );
        this.#regionVars.push(regionVar);
        return regionVar;
    }

    get universalRegionVars(): RegionVariable[] {
        return this.#regionVars.filter((r) => r.kind === RegionVariable.Kind.UNIVERSAL);
    }

    debugInfo(): string {
        let result = "\t| Regions:\n";
        for (const region of this.#regionVars) {
            const points = Array.from(region.points).sort();
            result += `\t|\t%${region.name}: {${points.join(", ")}}\n`;
        }

        result += "\t|\n\t| Constraints:\n";
        for (const constraint of this.constraints) {
            result += `\t|\t${constraint.toString()}\n`;
        }

        return result + "\n";
    }
}
