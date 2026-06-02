// --- MemoryModelGenerator.ts ---
import CoralCfgNode from "@specs-feup/coral/graph/CoralCfgNode";
import CoralFunctionNode from "@specs-feup/coral/graph/CoralFunctionNode";
import CoralTransformation, { CoralTransformationApplier } from "@specs-feup/coral/graph/CoralTransformation";
import VariableDeclarationNode from "@specs-feup/clava-flow/cfg/node/VariableDeclarationNode";
import ExpressionNode from "@specs-feup/clava-flow/cfg/node/ExpressionNode";
import Node from "@specs-feup/flow/graph/Node";
import FnSymbol from "@specs-feup/coral/mir/symbol/Fn";
import { MemoryNode } from "@specs-feup/coral/symbol/MemoryModel";
import { Nullability } from "@specs-feup/coral/symbol/Nullability";

interface MemoryGeneratorArgs {
    target: CoralFunctionNode.Class;
}

export default class MemoryModelGenerator extends CoralTransformation<MemoryGeneratorArgs> {
    applier = MemoryModelGeneratorApplier;
}

class MemoryModelGeneratorApplier extends CoralTransformationApplier<MemoryGeneratorArgs> {
    apply(): void {
        const fnSymbol: FnSymbol = this.args.target.getSymbol(this.args.target.jp);
        
        // Initialize the memory map on the FnSymbol (you will need to add this property to the FnSymbol class)
        //fnSymbol.memoryMap = new Map<string, MemoryNode>();

        this.#buildMemoryGraph(fnSymbol);
    }

    #buildMemoryGraph(fnSymbol: FnSymbol) {
        const nodes = this.args.target.controlFlowNodes.expectAll(CoralCfgNode);

        for (const node of nodes) {
            node.switch(
                Node.Case(VariableDeclarationNode, n => {
                    const varName = n.jp.name;
                    const isPointer = n.jp.type.joinPointType === "pointerType" || n.jp.type.code.includes("*");
                    const isStructer = n.jp.type.joinPointType === "pointerType" || n.jp.type.code.includes("struct");

                    if (isPointer) {
                        // We might not know what it points to yet, but it's a pointer
                        //fnSymbol.memoryMap.set(varName, { kind: "pointer", pointsTo: "" , isGlobal:false, state: Nullability.MAYBE_NULL});
                        if (n.jp.hasInit){

                        }{

                        }
                    } else if(isStructer){
                        // It is a stack object (int, struct)
                      
                    }
                    
                }),

                Node.Case(ExpressionNode, n => {
                    // TODO: Intercept assignments (ptr = &myBox) and update PointerNode.pointsTo
                    // TODO: Intercept field accesses (myBox.data) and add "data" to ObjectNode.fields
                    // TODO: Intercept conditions (ptr == NULL) and create ConditionNodes
                })
            );
        }
    }
}