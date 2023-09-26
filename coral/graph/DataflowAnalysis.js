class DataflowAnalysis {

    /**
     * @param {cytoscapenode} root
     * @param {function(cytoscapenode) -> boolean} propagateFn
     */
    static transfer(root, transferFn) {
        const toVisit = [];
        const visited = new Set();
        let changed = false;

        toVisit.push(root);

        while (toVisit.length > 0) {
            const node = toVisit.pop();
            if (visited.has(node)) {
                continue;
            }

            changed |= transferFn(node);
            visited.add(node);

            for (const out of node.outgoers().nodes()) {
                toVisit.push(out);
            }
        }

        return changed;
    }
}