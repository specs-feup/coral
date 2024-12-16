import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import { Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import Access from "@specs-feup/coral/mir/Access";
import Loan from "@specs-feup/coral/mir/Loan";
import Path from "@specs-feup/coral/mir/path/Path";
import RefTy from "@specs-feup/coral/mir/symbol/ty/RefTy";
import RegionVariable from "@specs-feup/coral/regionck/RegionVariable";
import Node from "@specs-feup/flow/graph/Node";

namespace CoralCfgNode {
    export const TAG = "__coral__coral_cfg_node";
    export const VERSION = "1";

    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends ClavaControlFlowNode.Class<D, S> {
        
        addAccess(path: Path, kind: Access.Kind) {
            this.scratchData[TAG].accesses.push(new Access(path, kind));
        }

        addLoan(loanedPath: Path, regionVar: RegionVariable, reborrow: boolean, leftTy: RefTy) {
            this.scratchData[TAG].loans.push(new Loan(loanedPath, regionVar, reborrow, leftTy));
        }
        
        get varsEnteringScope(): Vardecl[] {
            return this.scratchData[TAG].varsEnteringScope;
        }

        set varsEnteringScope(vars: Vardecl[]) {
            this.scratchData[TAG].varsEnteringScope = vars;
        }

        get varsLeavingScope(): Vardecl[] {
            return this.scratchData[TAG].varsLeavingScope;
        }

        set varsLeavingScope(vars: Vardecl[]) {
            this.scratchData[TAG].varsLeavingScope = vars;
        }
    }

    export class Builder
        implements
            Node.Builder<
                Data,
                ScratchData,
                ClavaControlFlowNode.Data,
                ClavaControlFlowNode.ScratchData
            >
    {
        buildData(data: ClavaControlFlowNode.Data): Data {
            return {
                ...data,
                [TAG]: {
                    version: VERSION,
                },
            };
        }

        buildScratchData(scratchData: ClavaControlFlowNode.ScratchData): ScratchData {
            return {
                ...scratchData,
                [TAG]: {
                    varsEnteringScope: [],
                    varsLeavingScope: [],
                    accesses: [],
                    loans: [],
                },
            };
        }
    }

    export const TypeGuard = Node.TagTypeGuard<Data, ScratchData>(
        TAG,
        VERSION,
        (sData) => {
            const sd = sData as CoralCfgNode.ScratchData;
            return ClavaControlFlowNode.TypeGuard.isScratchDataCompatible(sData);
            // TODO add more tests ?
        },
    );

    export interface Data extends ClavaControlFlowNode.Data {
        [TAG]: {
            version: typeof VERSION;
        };
    }

    export interface ScratchData extends ClavaControlFlowNode.ScratchData {
        [TAG]: {
            varsEnteringScope: Vardecl[];
            varsLeavingScope: Vardecl[];
            accesses: Access[];
            loans: Loan[];
        };
    }
}

export default CoralCfgNode;
