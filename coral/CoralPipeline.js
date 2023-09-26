laraImport("weaver.Query");

laraImport("coral.CoralNormalizer");
laraImport("coral.CoralAnalyser");

laraImport("coral.errors.CoralError");


class CoralPipeline {
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
                println(e.message);
            } else {
                throw e;
            }
        }
    }
}
