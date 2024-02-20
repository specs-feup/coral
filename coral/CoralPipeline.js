laraImport("weaver.Query");

laraImport("coral.CoralNormalizer");
laraImport("coral.CoralAnalyser");


class CoralPipeline {
    #debug;
    #mirDotFile;
    #livenessDotFile;

    constructor() {
        this.#debug = false;
        this.#mirDotFile = null;
        this.#livenessDotFile = null;
    }

    writeMirToDotFile(path) {
        this.#mirDotFile = path;
        return this;
    }

    writeLivenessToDotFile(path) {
        this.#livenessDotFile = path;
        return this;
    }

    debug() {
        this.#debug = true;
        return this;
    }

    apply($root = null) {
        if ($root === null) {
            $root = Query.root();
        }

        let normalizer = new CoralNormalizer();
        let analyser = new CoralAnalyser()
            .writeMirToDotFile(this.#mirDotFile)
            .writeLivenessToDotFile(this.#livenessDotFile)
            .debug(this.#debug);

        normalizer.apply($root);
        analyser.apply($root);
    }
}
