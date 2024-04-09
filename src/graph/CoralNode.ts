import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import FlowNode from "clava-flow/flow/node/FlowNode";
import InstructionNode from "clava-flow/flow/node/instruction/InstructionNode";
import LivenessNode from "clava-flow/flow/transformation/liveness/LivenessNode";
import BaseNode from "clava-flow/graph/BaseNode";
import { NodeBuilder, NodeTypeGuard } from "clava-flow/graph/Node";
import { Joinpoint, Vardecl } from "clava-js/api/Joinpoints.js";
import Access from "coral/mir/Access";
import Loan from "coral/mir/Loan";

namespace CoralNode {
    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends FlowNode.Class<D, S> {
        get liveIn(): Set<Vardecl> {
            return this.scratchData.liveness.liveIn;
        }

        get liveOut(): Set<Vardecl> {
            return this.scratchData.liveness.liveOut;
        }

        get accesses(): Access[] {
            return this.scratchData.coral.accesses;
        }

        get assignments(): Access[] {
            return this.scratchData.coral.accesses.filter((access) => access.mutability === Access.Mutability.WRITE);
        }

        get inScopeLoans(): Set<Loan> {
            return this.scratchData.coral.inScopeLoans;
        }

        set inScopeLoans(loans: Set<Loan>) {
            this.scratchData.coral.inScopeLoans = loans;
        }

        get varsEnteringScope(): Vardecl[] {
            return this.scratchData.coral.varsEnteringScope;
        }

        set varsEnteringScope(vars: Vardecl[]) {
            this.scratchData.coral.varsEnteringScope = vars;
        }

        get varsLeavingScope(): Vardecl[] {
            return this.scratchData.coral.varsLeavingScope;
        }

        set varsLeavingScope(vars: Vardecl[]) {
            this.scratchData.coral.varsLeavingScope = vars;
        }

        get loan(): Loan | undefined {
            return this.scratchData.coral.loan;
        }

        set loan(loan: Loan | undefined) {
            this.scratchData.coral.loan = loan;
        }

        override get jp(): Joinpoint {
            return this.scratchData.$jp;
        }
    }

    export class Builder
        extends BaseNode.Builder
        implements NodeBuilder<Data, ScratchData>
    {
        override buildData(data: BaseNode.Data): Data {
            if (!LivenessNode.TypeGuard.isDataCompatible(data)) {
                throw new Error("CoralNode must have Liveness data to be initialized.");
            }

            return {
                ...data,
                ...super.buildData(data),
            };
        }

        override buildScratchData(scratchData: BaseNode.ScratchData): ScratchData {
            if (!LivenessNode.TypeGuard.isScratchDataCompatible(scratchData)) {
                throw new Error("CoralNode must have Liveness data to be initialized.");
            }

            if (scratchData.$jp === undefined) {
                throw new Error("CoralNode must have a joinpoint to be initialized.");
            }

            return {
                ...scratchData as LivenessNode.ScratchData & { $jp: Joinpoint },
                ...super.buildScratchData(scratchData),
                coral: {
                    inScopeLoans: new Set(),
                    accesses: [],
                    varsEnteringScope: [],
                    varsLeavingScope: [],
                }
            };
        }
    }

    export const TypeGuard: NodeTypeGuard<Data, ScratchData> = {
        isDataCompatible(data: BaseNode.Data): data is Data {
            if (!BaseNode.TypeGuard.isDataCompatible(data)) return false;
            if (!LivenessNode.TypeGuard.isDataCompatible(data)) return false;
            return true;
        },

        isScratchDataCompatible(
            scratchData: BaseNode.ScratchData,
        ): scratchData is ScratchData {
            if (!BaseNode.TypeGuard.isScratchDataCompatible(scratchData)) return false;
            if (!LivenessNode.TypeGuard.isScratchDataCompatible(scratchData)) return false;
            if (!scratchData.$jp) return false;
            const sData = scratchData as ScratchData;
            if (!sData.coral) return false;
            return true;
        },
    };

    export interface Data extends BaseNode.Data, LivenessNode.Data {}

    export interface ScratchData extends BaseNode.ScratchData, LivenessNode.ScratchData {
        coral: {
            inScopeLoans: Set<Loan>;
            accesses: Access[];
            varsEnteringScope: Vardecl[];
            varsLeavingScope: Vardecl[];
            loan?: Loan;
        };
        $jp: Joinpoint;
    }
}

export default CoralNode;
