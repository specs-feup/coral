// Without this import, clava does not work for some reason
import "@specs-feup/clava/api/Joinpoints.js";

import Query from "@specs-feup/lara/api/weaver/Query.js";

import CoralError from "coral/error/CoralError";
import CoralPipeline from "coral/CoralPipeline";
import Clava from "@specs-feup/clava/api/clava/Clava.js";

Clava.pushAst();

console.log(Query.root().dump);

const pipeline = new CoralPipeline()
    .debug()
    .inferFunctionLifetimes()
    .writeMirToDotFile("out/woven_code/sandbox/mir.dot")
    .writeLivenessToDotFile("out/woven_code/sandbox/liveness.dot");

try {
    pipeline.apply();
} catch (e) {
    if (e instanceof CoralError) {
        console.log(e.message);
    } else {
        throw e;
    }
}
