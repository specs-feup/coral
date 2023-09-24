laraImport("coral.mir.path.Path");
laraImport("coral.mir.path.PathKind");

class PathVarRef extends Path {

    constructor($jp, inner) {
        super($jp, inner);
    }

    get kind() {
        return PathKind.VARREF;
    }

    toString() {
        return this.$jp.name;
    }
}