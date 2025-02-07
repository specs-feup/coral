interface UnitProperties {
    // Name of the unit, appears after the number
    unit: string;
    // Gap from previous scale, divides by this number
    gap: number;
    // Threshold until which this scale is used
    threshold?: number;
    // Precision of the number
    precision: number;
}

class UnitBuilder {
    #scales: UnitProperties[];
    constructor() {
        this.#scales = [];
    }

    add(unit: string, gap: number, threshold?: number, precision: number = 0): this {
        this.#scales.push({ unit, gap, threshold, precision });
        return this;
    }

    apply(n: number): string {
        for (const { unit, gap, threshold, precision } of this.#scales) {
            n /= gap;
            if (threshold === undefined || n < threshold) {
                return `${n.toFixed(precision)}${unit}`;
            }
        }

        throw new Error("Unreachable");
    }
}


export function duration_unit(duration: number): string {
    return new UnitBuilder()
        .add("ns", 1, 1e5)
        .add("ms", 1e6, 10, 2)
        .add("ms", 1, 1e3, 1)
        .add("s", 1e3, 10, 1)
        .add("s", 1)
        .apply(duration);
}

export function memory_unit(memory: number): string {
    return new UnitBuilder()
        .add(" B", 1, 1024, 2)
        .add(" KiB", 1024, 1024, 2)
        .add(" MiB", 1024, undefined, 2)
        .apply(memory);
}
