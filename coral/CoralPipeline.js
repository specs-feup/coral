laraImport("weaver.Query");

laraImport("coral.CoralNormalizer");
laraImport("coral.CoralAnalyser");


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
