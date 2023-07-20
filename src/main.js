laraImport("weaver.Query");
laraImport("clava.graphs.ControlFlowGraph");
laraImport("clava.graphs.StaticCallGraph");
laraImport("lara.graphs.Graphs");


const root = Query.search("function", {name: "main"}).first();

const scg = StaticCallGraph.build(root);
println(scg.toDot());
