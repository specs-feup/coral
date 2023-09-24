laraImport("coral.mir.path.Path");
laraImport("coral.mir.path.PathKind");

class PathDeref extends Path {
   
    constructor($jp, inner) {
        super($jp, inner);
    }

    get kind() {
        return PathKind.DEREF;
    }

    toString() {
        return "(*" + this.inner.toString() + ")";
    }
}