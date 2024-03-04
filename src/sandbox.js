laraImport("coral.CoralPipeline");

laraImport("weaver.Query");
console.log(Query.root().dump + "\n\n")

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
