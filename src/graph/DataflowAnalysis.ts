import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";


export default class DataflowAnalysis {
    static dfs(
        root: cytoscape.NodeSingular,
        transferFn: (node: cytoscape.NodeSingular) => boolean,
    ) {
        let changed;
        do {
            changed = DataflowAnalysis.#dfsInner(root, transferFn);
        } while (changed);
    }

    static #dfsInner(
        root: cytoscape.NodeSingular,
        transferFn: (node: cytoscape.NodeSingular) => boolean,
    ) {
        // TODO: Review this implementation, I think its wrong
        const toVisit = [];
        const visited = new Set();
        let changed = false;

        toVisit.push(root);

        while (toVisit.length > 0) {
            const node = toVisit.pop() as cytoscape.NodeSingular;
            if (visited.has(node)) {
                continue;
            }

            changed ||= transferFn(node);
            visited.add(node);

            for (const out of node.outgoers().nodes()) {
                toVisit.push(out);
            }
        }

        return changed;
    }
}
