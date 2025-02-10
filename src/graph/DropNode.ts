import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";
import Node from "@specs-feup/flow/graph/Node";

namespace DropNode {
    export const TAG = "__coral__drop_node";
    export const VERSION = "1";

    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends CoralCfgNode.Class<D, S> {
        get isDropConditional(): boolean {
            return this.data[TAG].isDropConditional;
        }

        get isDropElaborated(): boolean {
            return this.data[TAG].isDropElaborated;
        }

        get isDropNotElaborated(): boolean {
            return !this.data[TAG].isDropElaborated;
        }

        get dropInsertLocation(): InsertLocation {
            return this.data[TAG].dropInsertLocation;
        }

        insertDropCallBefore($call: string): void {
            let targetNode: CoralCfgNode.Class = this;
            while (targetNode.tryAs(DropNode)?.isDropNotElaborated) {
                const nextNodes = targetNode.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
                if (nextNodes.length !== 1) {
                    throw new Error(
                        "Drop nodes with insertBefore must have exactly one successor",
                    );
                }
                targetNode = nextNodes[0];
            }
            const jp = targetNode.tryAs(DropNode)?.data[TAG]?.dropTarget ?? targetNode.jp;
            this.data[TAG].dropTarget = jp.insertBefore($call);
            this.data[TAG].isDropElaborated = true;
        }

        insertDropCallAfter($call: string): void {
            let targetNode: CoralCfgNode.Class = this;
            while (targetNode.tryAs(DropNode)?.isDropNotElaborated) {
                const previousNodes = targetNode.incomers.filterIs(ControlFlowEdge).sources.filterIs(CoralCfgNode);
                if (previousNodes.length !== 1) {
                    throw new Error(
                        "Drop nodes with insertAfter must have exactly one predecessor",
                    );
                }
                targetNode = previousNodes[0];
            }
            const jp = targetNode.tryAs(DropNode)?.data[TAG]?.dropTarget ?? targetNode.jp;
            this.data[TAG].dropTarget = jp.insertAfter($call);
            this.data[TAG].isDropElaborated = true;
        }
    }

    export class Builder
        implements
            Node.Builder<
                Data,
                ScratchData,
                CoralCfgNode.Data,
                CoralCfgNode.ScratchData
            >
    {
        #isConditional: boolean;
        #insertLocation: InsertLocation;
        
        constructor(isConditional: boolean, insertLocation: InsertLocation) {
            this.#isConditional = isConditional;
            this.#insertLocation = insertLocation;
        }

        buildData(data: CoralCfgNode.Data): Data {
            return {
                ...data,
                [TAG]: {
                    version: VERSION,
                    isDropConditional: this.#isConditional,
                    isDropElaborated: false,
                    dropInsertLocation: this.#insertLocation,
                    dropTarget: undefined,
                },
            };
        }

        buildScratchData(scratchData: CoralCfgNode.ScratchData): ScratchData {
            return {
                ...scratchData,
            };
        }
    }

    export const TypeGuard = Node.TagTypeGuard<Data, ScratchData>(
        TAG,
        VERSION,
        (sData) => {
            return CoralCfgNode.TypeGuard.isScratchDataCompatible(sData);
        },
    );

    export interface Data extends CoralCfgNode.Data {
        [TAG]: {
            version: typeof VERSION;
            isDropConditional: boolean;
            isDropElaborated: boolean;
            dropInsertLocation: InsertLocation;
            dropTarget: Joinpoint | undefined;
        };
    }

    export interface ScratchData extends CoralCfgNode.ScratchData {}

    export enum InsertLocation {
        BEFORE_TARGET = "before",
        AFTER_TARGET = "after",
    }
}

export default DropNode;
