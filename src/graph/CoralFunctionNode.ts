import ClavaFunctionNode from "@specs-feup/clava-flow/ClavaFunctionNode";
import {
    FunctionJp,
    Joinpoint,
    RecordJp,
    Vardecl,
} from "@specs-feup/clava/api/Joinpoints.js";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import Def from "@specs-feup/coral/mir/symbol/Def";
import Fn from "@specs-feup/coral/mir/symbol/Fn";
import MetaRegionBound from "@specs-feup/coral/mir/symbol/MetaRegionBound";
import Region from "@specs-feup/coral/mir/symbol/Region";
import RegionConstraint, {
    Variance,
} from "@specs-feup/coral/mir/symbol/RegionConstraint";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import InferRegionBounds from "@specs-feup/coral/pipeline/analyze/regionck/InferRegionBounds";
import FileSymbolTable from "@specs-feup/coral/symbol/FileSymbolTable";
import FunctionSymbolTable from "@specs-feup/coral/symbol/FunctionSymbolTable";
import Node from "@specs-feup/flow/graph/Node";

namespace CoralFunctionNode {
    export const TAG = "__coral__coral_function_node";
    export const VERSION = "1";

    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends ClavaFunctionNode.Class<D, S> {
        getSymbol($decl: Vardecl): Ty;
        getSymbol($decl: RecordJp): Def;
        getSymbol($decl: FunctionJp): Fn;
        getSymbol($decl: Vardecl | RecordJp | FunctionJp): Ty | Def | Fn {
            return this.scratchData[TAG].symbolTable.get($decl);
        }

        registerSymbol($decl: Vardecl, ty: Ty) {
            this.scratchData[TAG].symbolTable.register($decl, ty);
        }

        generateRegion(kind: Region.Kind) {
            return this.scratchData[TAG].symbolTable.generateRegion(kind);
        }

        get staticRegion(): Region {
            return this.scratchData[TAG].symbolTable.staticRegion;
        }

        get regions(): Iterable<Region> {
            return this.scratchData[TAG].symbolTable.regions;
        }

        get universalRegions(): Iterable<Region> {
            return this.scratchData[TAG].symbolTable.universalRegions;
        }

        get returnTy(): Ty {
            return this.scratchData[TAG].symbolTable.returnTy;
        }

        set returnTy(ret: Ty) {
            this.scratchData[TAG].symbolTable.returnTy = ret;
        }

        get bounds(): MetaRegionBound[] {
            return this.scratchData[TAG].symbolTable.get(this.jp).bounds;
        }

        addBound(bound: MetaRegionBound) {
            this.scratchData[TAG].symbolTable.get(this.jp).addBound(bound);
        }

        get regionConstraints(): RegionConstraint[] {
            return this.scratchData[TAG].constraints;
        }

        addConstraint(
            region1: Region,
            region2: Region,
            variance: Variance,
            node: CoralCfgNode.Class,
        ): void {
            switch (variance) {
                case Variance.CO: // "a Co b" == "a <= b"
                    this.scratchData[TAG].constraints.push(
                        new RegionConstraint(region2, region1, node),
                    );
                    break;
                case Variance.CONTRA: // "a Contra b" == "a >= b"
                    this.scratchData[TAG].constraints.push(
                        new RegionConstraint(region1, region2, node),
                    );
                    break;
                case Variance.IN: // "a In b" == "a == b"
                    this.scratchData[TAG].constraints.push(
                        new RegionConstraint(region2, region1, node),
                    );
                    this.scratchData[TAG].constraints.push(
                        new RegionConstraint(region1, region2, node),
                    );
                    break;
            }
        }

        resetRegionck() {
            this.scratchData[TAG].constraints = [];
            for (const region of this.scratchData[TAG].symbolTable.regions) {
                region.reset();
            }
        }

        get inferRegionBoundsState(): InferRegionBounds.FunctionState {
            return this.scratchData[TAG].inferRegionBoundsState;
        }

        set inferRegionBoundsState(state: InferRegionBounds.FunctionState) {
            this.scratchData[TAG].inferRegionBoundsState = state;
        }
    }

    export class Builder
        implements
            Node.Builder<
                Data,
                ScratchData,
                ClavaFunctionNode.Data,
                ClavaFunctionNode.ScratchData
            >
    {
        #fileTable: FileSymbolTable;
        constructor(fileTable: FileSymbolTable) {
            this.#fileTable = fileTable;
        }

        buildData(data: ClavaFunctionNode.Data): Data {
            return {
                ...data,
                [TAG]: {
                    version: VERSION,
                },
            };
        }

        buildScratchData(scratchData: ClavaFunctionNode.ScratchData): ScratchData {
            return {
                ...scratchData,
                [TAG]: {
                    symbolTable: new FunctionSymbolTable(this.#fileTable),
                    constraints: [],
                    inferRegionBoundsState: InferRegionBounds.FunctionState.IGNORE,
                },
            };
        }
    }

    export const TypeGuard = Node.TagTypeGuard<Data, ScratchData>(
        TAG,
        VERSION,
        (sData) => {
            const sd = sData as CoralFunctionNode.ScratchData;
            return ClavaFunctionNode.TypeGuard.isScratchDataCompatible(sData);
            // TODO add more tests ?
        },
    );

    export interface Data extends ClavaFunctionNode.Data {
        [TAG]: {
            version: typeof VERSION;
        };
    }

    export interface ScratchData extends ClavaFunctionNode.ScratchData {
        [TAG]: {
            symbolTable: FunctionSymbolTable;
            constraints: RegionConstraint[];
            inferRegionBoundsState: InferRegionBounds.FunctionState;
        };
    }
}

export default CoralFunctionNode;
