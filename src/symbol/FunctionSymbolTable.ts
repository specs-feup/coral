import { FunctionJp, RecordJp, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import Def from "@specs-feup/coral/mir/symbol/Def";
import Fn from "@specs-feup/coral/mir/symbol/Fn";
import Region from "@specs-feup/coral/mir/symbol/Region";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import DefMap from "@specs-feup/coral/symbol/DefMap";
import FileSymbolTable from "@specs-feup/coral/symbol/FileSymbolTable";
import FnMap from "@specs-feup/coral/symbol/FnMap";
import RegionMap from "@specs-feup/coral/symbol/RegionMap";
import TyMap from "@specs-feup/coral/symbol/TyMap";

export default class FunctionSymbolTable {
    #tyMap: TyMap;
    #defMap: DefMap;
    #fnMap: FnMap;
    #regionMap: RegionMap;
    #returnTy?: Ty;

    constructor(fileTable: FileSymbolTable) {
        this.#defMap = fileTable.defMap;
        this.#fnMap = fileTable.fnMap;
        this.#regionMap = new RegionMap();
        this.#tyMap = new TyMap(this.#defMap, this.#regionMap);
    }

    get staticRegion() {
        return this.#regionMap.staticRegion;
    }

    get regions() {
        return this.#regionMap.regions;
    }

    get universalRegions() {
        return this.#regionMap.universalRegions;
    }

    get($decl: Vardecl): Ty;
    get($decl: RecordJp): Def;
    get($decl: FunctionJp): Fn;
    get($decl: Vardecl | RecordJp | FunctionJp): Ty | Def | Fn;
    get($decl: Vardecl | RecordJp | FunctionJp): Ty | Def | Fn {
        if ($decl instanceof Vardecl) {
            return this.#tyMap.get($decl);
        } else if ($decl instanceof RecordJp) {
            return this.#defMap.get($decl);
        }
        return this.#fnMap.get($decl);
    }

    register($decl: Vardecl, ty: Ty) {
        this.#tyMap.register($decl, ty);
    }

    generateRegion(kind: Region.Kind) {
        return this.#regionMap.generate(kind);
    }

    // TODO instead of this set, put it in the constructor
    //      this would require initializing the symbol table
    //      before the function node
    set returnTy($return: Ty) {
        this.#returnTy = $return;
    }

    get returnTy() {
        if (this.#returnTy === undefined) {
            throw new Error("returnTy not set");
        }
        return this.#returnTy;
    }
}
