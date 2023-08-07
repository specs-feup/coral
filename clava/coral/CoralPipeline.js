laraImport("weaver.Query");

laraImport("clava.coral.CoralNormalizer");
laraImport("clava.coral.CoralAnalyser");


class CoralPipeline {
    #normalizer;
    #analyser;

    constructor() {
        this.#normalizer = new CoralNormalizer();
        this.#analyser = new CoralAnalyser();
    }

    apply() {
        const $jp = Query.root();
        this.#normalizer.apply($jp);
        this.#analyser.apply($jp);
    }
}
