import AssignmentKind from "./AssignmentKind.js";
import Path from "./path/Path.js";
import Ty from "../ty/Ty.js";

export default class Assignment {
  
    /**
     * @param {AssignmentKind} kind
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

    /**
     * 
     * @param {AssignmentKind} kind 
     * @param {Path} toPath 
     * @param {Ty} toTy 
     * @param {Path} fromPath 
     * @param {Ty} fromTy 
     */
    constructor(kind, toPath, toTy, fromPath = undefined, fromTy = undefined) {
        this.kind = kind;
        this.toPath = toPath;
        this.toTy = toTy;
        this.fromPath = fromPath;
        this.fromTy = fromTy;
    }

    /**
     * @returns {string}
     */
    toString() {
        if (this.fromPath === undefined)
            return `${this.kind} to ${this.toPath}`;
        else
            return `${this.kind} from ${this.fromPath} to ${this.toPath}`;
    }
 
}