laraImport("coral.CoralPipeline");

laraImport("weaver.Query");
println(Query.root().dump + "\n\n")

const pipeline = new CoralPipeline()
    .debug()
    .writeMirToDotFile("out/woven_code/sandbox/mir.dot")
    .writeLivenessToDotFile("out/woven_code/sandbox/liveness.dot");

try {
    pipeline.apply(); 
} catch (e) {
    if (e instanceof CoralError) {
        println(e.message);
    } else {
        throw e;
    }
}
