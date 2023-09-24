laraImport("coral.mir.path.Path");
laraImport("coral.mir.path.PathKind");

class PathMemberAccess extends Path {
    
    constructor($jp, inner) {
        super($jp, inner);
    }

    get kind() {
        return PathKind.MEMBER_ACCESS;
    }

    toString() {
        throw new Error("PathMemberAccess toString() not implemented");
    }
}