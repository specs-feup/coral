// Without this import, clava-js does not work for some reason
import "clava-js/api/Joinpoints.js";

import Query from "lara-js/api/weaver/Query.js";

import CoralError from "coral/error/CoralError";
import CoralPipeline from "coral/CoralPipeline";
import { Vardecl, Varref } from "clava-js/api/Joinpoints.js";

console.log(Query.root().dump);

const pipeline = new CoralPipeline()
    .debug()
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
