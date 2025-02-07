// TODO Without this import, clava does not work for some reason
// import "@specs-feup/clava/api/Joinpoints.js";

import run_coral from "@specs-feup/coral/Coral";
import CoralError from "@specs-feup/coral/error/CoralError";


try {
    run_coral({
        debug: true,
        verbose: true,
        instrumentation: true,
        inferFunctionLifetimeBounds: true,
        //     .writeMirToDotFile("out/woven_code/sandbox/mir.dot")
        //     .writeLivenessToDotFile("out/woven_code/sandbox/liveness.dot");
    }); 
} catch (e) {
    if (e instanceof CoralError) {
        console.log(e.message);
    } else {
        throw e;
    }
}
