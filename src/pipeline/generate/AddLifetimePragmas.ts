import { Pragma } from "@specs-feup/clava/api/Joinpoints.js";
import CoralFunctionWiseTransformation, { CoralFunctionWiseTransformationApplier } from "@specs-feup/coral/graph/CoralFunctionWiseTransformation";
import LifetimeAssignmentBuilder from "@specs-feup/coral/mir/symbol/ty/meta/LifetimeAssignmentBuilder";
import MetaTy from "@specs-feup/coral/mir/symbol/ty/meta/MetaTy";

export default class AddLifetimePragmas extends CoralFunctionWiseTransformation {
    fnApplier = AddLifetimePragmasApplier;
}

class AddLifetimePragmasApplier extends CoralFunctionWiseTransformationApplier {
    apply(): void {
        const fnSymbol = this.fn.getSymbol(this.fn.jp);

        // TODO create equivalence class to reduce number of pragmas
        //      using a disjoint set might be a good idea https://en.wikipedia.org/wiki/Disjoint-set_data_structure 

        // const boundsConnection = new Set<string>();
        // const equivalenceClass = new Map<string, string>();
        // for (const bound of fnSymbol.addedBounds) {
        //     if (!equivalenceClass.has(bound.sub.name)) {
        //         equivalenceClass.set(bound.sub.name, bound.sub.name);
        //     }
        //     if (!equivalenceClass.has(bound.sup.name)) {
        //         equivalenceClass.set(bound.sup.name, bound.sup.name);
        //     }

        //     if (boundsConnection.has(`${bound.sub.name}: ${bound.sup.name}`)) {

        //     } else {
        //         boundsConnection.add(`${bound.sup.name}: ${bound.sub.name}`);
        //     }
        // }

        // const nameGenerator = alphabeticMetaRegionGenerator(new Set(fnSymbol.baseMetaRegions.map(m => m.name)));

        const addedMetaRegions = new Set(
            fnSymbol.addedMetaRegions.map((metaRegion) => metaRegion.name),
        );
        // const generatedNames = new Map<string, string>();

        for (const param of fnSymbol.params) {
            this.#insertParamPragmas(param.jp.name, param.ty, addedMetaRegions);
        }
        this.#insertParamPragmas("return", fnSymbol.return, addedMetaRegions);

        for (const bound of fnSymbol.addedBounds) {
            this.fn.jp.insertBefore(bound.toPragma());
        }
    }

    #insertParamPragmas(param: string, metaTy: MetaTy, addedMetaRegions: Set<string>): void {
        const baseBuilder = new LifetimeAssignmentBuilder(param);
        for (const [b, metaRegion] of metaTy.generateLifetimeAssignments(baseBuilder)) {
            // TODO check if is one with bounds or equivalence, to reduce number of pragmas
            if (!addedMetaRegions.has(metaRegion.name)) {
                continue;
            }

            // const equivalent = equivalenceClass.get(metaRegion.name)!;
            // const rhs = generatedNames.get(equivalent)!;

            this.fn.jp.insertBefore(b.toPragma(metaRegion.name));
        }
    }
}
