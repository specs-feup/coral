import { FunctionJp, RecordJp } from "@specs-feup/clava/api/Joinpoints.js";
import Def from "@specs-feup/coral/mir/symbol/Def";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import Region from "@specs-feup/coral/regionck/RegionVariable";

export default class StructTy implements Ty {
    #def: Def;
    #regionVarMap: Map<string, Region>;
    #isConst: boolean;

    constructor(def: Def, regionVarMap: Map<string, Region>, isConst: boolean) {
        this.#def = def;
        this.#regionVarMap = regionVarMap;
        this.#isConst = isConst;
    }

    get regionVars(): Region[] {
        return Array.from(this.regionVarMap.values());
    }

    get semantics(): Ty.Semantics {
        return this.#def.semantics;
    }

    get isConst(): boolean {
        return this.#isConst;
    }

    get jp(): RecordJp {
        return this.#def.jp;
    }

    get isComplete(): boolean {
        return this.#def.isComplete;
    }

    get regionVarMap(): Map<string, Region> {
        return this.#regionVarMap;
    }

    get fields(): Map<string, Ty> {
        const fields = new Map<string, Ty>();
        for (const [name, metaTy] of this.#def.fields.entries()) {
            fields.set(name, metaTy.toTy(this.regionVarMap));
        }

        return fields;
    }

    get dropFunction(): FunctionJp | undefined {
        return this.#def.dropFunction;
    }

    toString(): string {
        const base = `struct ${this.jp.name}`;
        if (this.regionVarMap.size > 0) {
            return base + `<${this.regionVars.map((r) => r.name).join(", ")}>`;
        } else {
            return base;
        }
    }
}
