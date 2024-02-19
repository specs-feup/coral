laraImport("weaver.Query");

laraImport("coral.CoralNormalizer");
laraImport("coral.CoralAnalyser");

laraImport("coral.errors.CoralError");


class CoralPipeline {
    constructor() {}

    apply($root = null) {
        if ($root === null) {
            $root = Query.root();
        }

        let normalizer = new CoralNormalizer();
        let analyser = new CoralAnalyser();

        try {
            normalizer.apply($root);
            analyser.apply($root);
        } catch (e) {
            if (e instanceof CoralError) {
                println(e.message);
            } else {
                throw e;
            }
        }
    }
}
