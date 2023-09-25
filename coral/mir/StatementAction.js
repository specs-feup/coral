laraImport("coral.mir.StatementActionKind");
laraImport("coral.mir.path.Path");
laraImport("coral.ty.Ty");

class StatementAction {
  
    /**
     * @param {StatementActionKind} kind
     */
    kind;

    /**
     * @param {Path} fromPath
     */
    fromPath;

    /**
     * @param {Path} fromPath
     */
    toPath;

    /**
     * @param {Ty} fromTy
     */
    fromTy;

    /**
     * @param {Ty} toTy
     */
    toTy;

    constructor(kind, fromPath, toPath, fromTy, toTy) {
        this.kind = kind;
        this.fromPath = fromPath;
        this.toPath = toPath;
        this.fromTy = fromTy;
        this.toTy = toTy;
    }

    /**
     * @returns {string}
     */
    toString() {
        return `${this.kind} from ${this.fromPath} to ${this.toPath}`;
    }
 
}