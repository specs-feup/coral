import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import { Call, Vardecl } from "@specs-feup/clava/api/Joinpoints.js";
import Access from "@specs-feup/coral/mir/action/Access";
import FunctionCall from "@specs-feup/coral/mir/action/FunctionCall";
import Loan from "@specs-feup/coral/mir/action/Loan";
import Path from "@specs-feup/coral/mir/path/Path";
import Region from "@specs-feup/coral/mir/symbol/Region";
import Ty from "@specs-feup/coral/mir/symbol/Ty";
import RefTy from "@specs-feup/coral/mir/symbol/ty/RefTy";
import MoveTable from "@specs-feup/coral/symbol/MoveTable";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";
import Node from "@specs-feup/flow/graph/Node";

namespace CoralCfgNode {
    export const TAG = "__coral__coral_cfg_node";
    export const VERSION = "1";

    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
        > extends ClavaControlFlowNode.Class<D, S> {
        get moveTable(): MoveTable {
            return this.scratchData[TAG].moveTable;
        }

        set moveTable(table: MoveTable) {
            this.scratchData[TAG].moveTable = table;
        }

        addAccess(path: Path, kind: Access.Kind) {
            this.scratchData[TAG].accesses.push(new Access(path, kind));
        }

        get accesses(): Access[] {
            return this.scratchData[TAG].accesses;
        }

        addLoan(loanedPath: Path, regionVar: Region, reborrow: boolean, leftTy: RefTy) {
            this.scratchData[TAG].loans.push(
                new Loan(loanedPath, regionVar, reborrow, leftTy),
            );
        }

        get loans(): Loan[] {
            return this.scratchData[TAG].loans;
        }

        addCall($jp: Call, regions: Map<string, Region>, returnTy: Ty, paramTys: Ty[]) {
            this.scratchData[TAG].fnCalls.push(
                new FunctionCall($jp, regions, returnTy, paramTys)
            );
        }

        get calls(): FunctionCall[] {
            return this.scratchData[TAG].fnCalls;
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

        addDef(def: Vardecl) {
            this.scratchData[TAG].liveness.defs.set(def.astId, def);
        }

        addUse(use: Vardecl) {
            this.scratchData[TAG].liveness.uses.set(use.astId, use);
        }

        get defs(): Vardecl[] {
            return Array.from(this.scratchData[TAG].liveness.defs.values());
        }

        get uses(): Vardecl[] {
            return Array.from(this.scratchData[TAG].liveness.uses.values());
        }

        get liveIn(): Vardecl[] {
            return Array.from(this.scratchData[TAG].liveness.liveIn.values());
        }

        updateLiveIn(): void {
            this.scratchData[TAG].liveness.liveIn = new Map();
            const liveIn = this.scratchData[TAG].liveness.liveIn;
            const liveOut = this.scratchData[TAG].liveness.liveOut;
            const defs = this.scratchData[TAG].liveness.defs;
            const uses = this.scratchData[TAG].liveness.uses;
            
            for (const [id, variable] of liveOut.entries()) {
                if (!defs.has(id)) {
                    liveIn.set(id, variable);
                }
            }

            for (const [id, variable] of uses.entries()) {
                liveIn.set(id, variable);
            }
        }

        get liveOut(): Vardecl[] {
            return Array.from(this.scratchData[TAG].liveness.liveOut.values());
        }

        updateLiveOut(): void {
            this.scratchData[TAG].liveness.liveOut = new Map();
            const liveOut = this.scratchData[TAG].liveness.liveOut;
            
            const children = this.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
            
            for (const child of children) {
                const childLiveIn = child
                    .scratchData[TAG]
                    .liveness
                    .liveIn;
                for (const [id, variable] of childLiveIn.entries()) {
                    liveOut.set(id, variable);
                }
            }
        }

        get inScopeLoans(): Set<Loan> {
            return this.scratchData[TAG].inScopeLoans;
        }

        set inScopeLoans(loans: Set<Loan>) {
            this.scratchData[TAG].inScopeLoans = loans;
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
                    moveTable: new MoveTable(),
                    accesses: [],
                    loans: [],
                    fnCalls: [],
                    liveness: {
                        defs: new Map(),
                        uses: new Map(),
                        liveIn: new Map(),
                        liveOut: new Map(),
                    },
                    inScopeLoans: new Set(),
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
            moveTable: MoveTable;
            accesses: Access[];
            loans: Loan[];
            fnCalls: FunctionCall[];
            liveness: {
                defs: Map<string, Vardecl>;
                uses: Map<string, Vardecl>;
                liveIn: Map<string, Vardecl>;
                liveOut: Map<string, Vardecl>;
            };
            inScopeLoans: Set<Loan>;
        };
    }
}

export default CoralCfgNode;
