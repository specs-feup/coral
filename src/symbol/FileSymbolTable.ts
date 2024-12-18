import { RecordJp } from "@specs-feup/clava/api/Joinpoints.js";
import Def from "@specs-feup/coral/mir/symbol/Def";
import DefMap from "@specs-feup/coral/symbol/DefMap";
import FnMap from "@specs-feup/coral/symbol/FnMap";

export default class FileSymbolTable {
    #defMap: DefMap;
    #fnMap: FnMap;

    constructor() {
        this.#defMap = new DefMap();
        this.#fnMap = new FnMap();
    }

    get defMap(): DefMap {
        return this.#defMap;
    }

    get fnMap(): FnMap {
        return this.#fnMap;
    }
}
