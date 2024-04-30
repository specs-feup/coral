import Query from "lara-js/api/weaver/Query.js";

import CoralNormalizer from "./CoralNormalizer.js";
import CoralAnalyser from "./CoralAnalyser.js";

import CoralError from "./errors/CoralError.js";

export default class CoralPipeline {
    #normalizer;
    #analyser;

    constructor() {
        this.#normalizer = new CoralNormalizer();
        this.#analyser = new CoralAnalyser();
    }

    apply() {
        try {
            const $jp = Query.root();
            console.log("CORAL Pipeline Started");
            this.#normalizer.apply($jp);
            console.log("CORAL Normalizer Finished");
            this.#analyser.apply($jp);
            console.log("CORAL Analyser Finished");
        } catch (e) {
            if (e instanceof CoralError) {
                console.log(e.message);
            } else {
                throw e;
            }
        }
    }
}
