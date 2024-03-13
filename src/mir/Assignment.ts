import Path from "coral/mir/path/Path";
import Ty from "coral/mir/ty/Ty";

// TODO isnt this just a (write) Access?
export default class Assignment {
    toPath: Path;

    constructor(
        toPath: Path,
    ) {
        this.toPath = toPath;
    }

    toString(): string {
        return `to ${this.toPath.toString()}`;
    }
}
