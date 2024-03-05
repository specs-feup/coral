import RegionVariable from "../../regionck/RegionVariable.js";

export default abstract class Ty {
    name: string;
    lifetimes: RegionVariable[];
    isConst: boolean;
    isCopyable: boolean;

    constructor(
        name: string,
        copyable: boolean,
        isConst: boolean,
        lifetimes: RegionVariable[],
    ) {
        this.name = name;
        this.isCopyable = copyable;
        this.isConst = isConst;
        this.lifetimes = lifetimes;
    }

    abstract equals(other: Ty): boolean;
    abstract toString(): string;

    nestedLifetimes(): RegionVariable[] {
        return this.lifetimes;
    }

    get requiresLifetimes(): boolean {
        return this.lifetimes.length > 0;
    }
}
