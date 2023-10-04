export default class DfsVisitor {

    /**
     * @param {cytoscapenode} root
     * @param {function(cytoscapenode) -> boolean} applyFn
     * @param {function(cytoscapenode) -> boolean} propagateFn
     */
    static visit(root, applyFn, propagateFn = _ => true) {
        const toVisit = [];
        const visited = new Set();
        let changed = false;

        if (propagateFn(root))
            toVisit.push(root);

        while (toVisit.length > 0) {
            const node = toVisit.pop();
            if (visited.has(node)) {
                continue;
            }

            changed |= applyFn(node);
            visited.add(node);

            for (const out of node.outgoers().nodes()) {
                if (propagateFn(out))
                    toVisit.push(out);
            }
        }

        return changed;
    }
}