import LfPath from "coral/pragma/lifetime/path/LfPath";

export default class LfPathVarRef extends LfPath {
    identifier: string;

    constructor(identifier: string) {
        super();
        this.identifier = identifier;
    }

    override get varName(): string {
        return this.identifier;
    }

    toString(): string {
        return this.identifier;
    }
}
