laraImport("lara.pass.SimplePass");
laraImport("lara.pass.results.PassResult");
laraImport("lara.Io");
laraImport("clava.graphs.ControlFlowGraph");

laraImport("coral.regionck.Regionck");
laraImport("coral.dot.MirDotFormatter");
laraImport("coral.dot.LivenessDotFormatter");

class CoralAnalyser extends SimplePass {

    #debug;
    #mirDotFile;
    #livenessDotFile;
    
    get name() {
        return "CoralAnalyser";
    }

    constructor() {
        super();
        this.#mirDotFile = null;
        this.#livenessDotFile = null;
        this.#debug = false;
    }

    writeMirToDotFile(path) {
        this.#mirDotFile = path;
        return this;
    }

    writeLivenessToDotFile(path) {
        this.#livenessDotFile = path;
        return this;
    }

    debug(debug) {
        this.#debug = debug;
        return this;
    }

    matchJoinpoint($jp) {
        return $jp.instanceOf("function") && $jp.name === "main" &&
            $jp.isImplementation;
    }

    transformJoinpoint($jp) {
        const regionck = new Regionck($jp).prepare(this.#debug);

        // println("liveness:")
        // println(regionck.cfg.toDot(new LivenessDotFormatter(regionck.liveness)));

        // println("mir:")
        // println(regionck.cfg.toDot(new MirDotFormatter()));

        if (this.#livenessDotFile) {
            Io.writeFile(this.#livenessDotFile, regionck.cfg.toDot(new LivenessDotFormatter(regionck.liveness)));
        }

        if (this.#mirDotFile) {
            Io.writeFile(this.#mirDotFile, regionck.cfg.toDot(new MirDotFormatter()));
        }

        regionck.borrowCheck();

        return new PassResult(this, $jp);
    }
}
