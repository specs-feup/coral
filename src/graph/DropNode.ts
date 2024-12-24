import ClavaControlFlowNode from "@specs-feup/clava-flow/ClavaControlFlowNode";
import ClavaNode from "@specs-feup/clava-flow/ClavaNode";
import { Joinpoint } from "@specs-feup/clava/api/Joinpoints.js";
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import ControlFlowEdge from "@specs-feup/flow/flow/ControlFlowEdge";
import ControlFlowNode from "@specs-feup/flow/flow/ControlFlowNode";
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

        get dropInsertLocation(): InsertLocation {
            return this.data[TAG].dropInsertLocation;
        }

        insertDropCallBefore($call: string): void {
            let targetNode: CoralCfgNode.Class = this;
            while (targetNode.tryAs(DropNode)?.isDropElaborated) {
                const nextNodes = targetNode.outgoers.filterIs(ControlFlowEdge).targets.filterIs(CoralCfgNode);
                if (nextNodes.length !== 1) {
                    throw new Error(
                        "Drop nodes with insertBefore must have exactly one successor",
                    );
                }
                targetNode = nextNodes[0];
            }
            this.jp = targetNode.jp.insertBefore($call);
            this.data[TAG].isDropElaborated = true;
        }

        insertDropCallAfter($call: string): void {
            let targetNode: CoralCfgNode.Class = this;
            while (targetNode.tryAs(DropNode)?.isDropElaborated) {
                const previousNodes = targetNode.incomers.filterIs(ControlFlowEdge).sources.filterIs(CoralCfgNode);
                if (previousNodes.length !== 1) {
                    throw new Error(
                        "Drop nodes with insertAfter must have exactly one predecessor",
                    );
                }
                targetNode = previousNodes[0];
            }
            this.jp = targetNode.jp.insertAfter($call);
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
        };
    }

    export interface ScratchData extends CoralCfgNode.ScratchData {}

    export enum InsertLocation {
        BEFORE_TARGET = "before",
        AFTER_TARGET = "after",
    }
}

export default DropNode;
