import { RecordJp, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import Def from "@specs-feup/coral/mir/symbol/Def";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import DefMap from "@specs-feup/coral/symbol/DefMap";
import TyMap from "@specs-feup/coral/symbol/TyMap";

export default class FileSymbolTable {
    #tySymbols: TyMap;
    #defSymbols: DefMap;
    //#fnSymbols: FnMap;

    constructor() {
        this.#tySymbols = new TyMap(this);
        this.#defSymbols = new DefMap();
    }

    get($decl: Vardecl): Ty;
    get($decl: RecordJp): Def;
    get($decl: Vardecl | RecordJp): Ty | Def;
    get($decl: Vardecl | RecordJp): Ty | Def {
        if ($decl instanceof Vardecl) {
            return this.#tySymbols.get($decl);
        }
        return this.#defSymbols.get($decl);
    }
}
