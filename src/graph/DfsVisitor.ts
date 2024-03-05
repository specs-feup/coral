import cytoscape from "lara-js/api/libs/cytoscape-3.26.0.js";

export default class DfsVisitor {
    static visit(
        root: cytoscape.NodeSingular,
        applyFn: (node: cytoscape.NodeSingular) => boolean,
        propagateFn: (node: cytoscape.NodeSingular) => boolean = (_) => true,
    ) {
        const toVisit = [];
        const visited = new Set();
        let changed = false;

        if (propagateFn(root)) toVisit.push(root);

        while (toVisit.length > 0) {
            const node = toVisit.pop() as cytoscape.NodeSingular;
            if (visited.has(node)) {
                continue;
            }

            changed ||= applyFn(node);
            visited.add(node);

            for (const out of node.outgoers().nodes()) {
                if (propagateFn(out)) toVisit.push(out);
            }
        }

        return changed;
    }
}
