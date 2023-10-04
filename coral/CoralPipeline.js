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
            this.#normalizer.apply($jp);
            this.#analyser.apply($jp);
        } catch (e) {
            if (e instanceof CoralError) {
                console.log(e.message);
            } else {
                throw e;
            }
        }
    }
}
