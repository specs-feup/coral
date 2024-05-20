// Without this import, clava-js does not work for some reason
import "clava-js/api/Joinpoints.js";

import Query from "lara-js/api/weaver/Query.js";

import CoralError from "coral/error/CoralError";
import CoralPipeline from "coral/CoralPipeline";
import { Joinpoint, Vardecl, Varref } from "clava-js/api/Joinpoints.js";
import CoralPragma from "coral/pragma/CoralPragma";
import Clava from "clava-js/api/clava/Clava.js";

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
