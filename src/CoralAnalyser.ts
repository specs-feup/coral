import SimplePass from "lara-js/api/lara/pass/SimplePass.js";
import PassResult from "lara-js/api/lara/pass/results/PassResult.js";
import Io from "lara-js/api/lara/Io.js";
import ControlFlowGraph from "clava-js/api/clava/graphs/ControlFlowGraph.js";

import Regionck from "./regionck/Regionck.js";
import MirDotFormatter from "./dot/MirDotFormatter.js";
import LivenessDotFormatter from "./dot/LivenessDotFormatter.js";
import { FunctionJp, Joinpoint } from "clava-js/api/Joinpoints.js";


export default class CoralAnalyser extends SimplePass {
    #debug: boolean;
    #mirDotFile: string | null;
    #livenessDotFile: string | null;

    protected override _name: string = "coral_analyser";

    constructor() {
        super();
        this.#mirDotFile = null;
        this.#livenessDotFile = null;
        this.#debug = false;
    }

    writeMirToDotFile(path: string | null): CoralAnalyser {
        this.#mirDotFile = path;
        return this;
    }

    writeLivenessToDotFile(path: string | null): CoralAnalyser {
        this.#livenessDotFile = path;
        return this;
    }

    debug(debug: boolean): CoralAnalyser {
        this.#debug = debug;
        return this;
    }

    override matchJoinpoint($jp: Joinpoint) {
        return $jp instanceof FunctionJp && $jp.name === "main" && $jp.isImplementation;
    }

    override transformJoinpoint($jp: FunctionJp) {
        const regionck = new Regionck($jp).prepare(this.#debug);

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
