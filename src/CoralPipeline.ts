import Query from "lara-js/api/weaver/Query.js";
import { Joinpoint } from "clava-js/api/Joinpoints.js";

import CoralNormalizer from "coral/CoralNormalizer";
import CoralAnalyser from "coral/CoralAnalyser";

export default class CoralPipeline {
    #debug: boolean;
    #mirDotFile: string | null;
    #livenessDotFile: string | null;

    constructor() {
        this.#debug = false;
        this.#mirDotFile = null;
        this.#livenessDotFile = null;
    }

    writeMirToDotFile(path: string): CoralPipeline {
        this.#mirDotFile = path;
        return this;
    }

    writeLivenessToDotFile(path: string): CoralPipeline {
        this.#livenessDotFile = path;
        return this;
    }

    debug(): CoralPipeline {
        this.#debug = true;
        return this;
    }

    apply($root: Joinpoint | null = null) {
        if ($root === null) {
            $root = Query.root() as Joinpoint;
        }

        const normalizer = new CoralNormalizer();
        const analyser = new CoralAnalyser()
            .writeMirToDotFile(this.#mirDotFile)
            .writeLivenessToDotFile(this.#livenessDotFile)
            .debug(this.#debug);

        normalizer.apply($root);
        analyser.apply($root);
    }
}
