import SimplePass from "lara-js/api/lara/pass/SimplePass.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";

import Regionck from "./borrowck/Regionck.js";

export default class CoralAnalyser extends SimplePass {

    get name() {
        return "CoralAnalyser";
    }

    constructor() {
        super();
    }

    matchJoinpoint($jp) {
        return $jp.instanceOf("function") && $jp.name === "main" &&
            $jp.isImplementation;
    }

    transformJoinpoint($jp) {
        const regionck = new Regionck($jp).prepare(true);

        regionck.mirToDotFile();
        console.log("After Inference:");
        console.log(regionck.aggregateRegionckInfo() + "\n\n");

        regionck.borrowCheck();

        return new PassResult(this, $jp);
    }

}