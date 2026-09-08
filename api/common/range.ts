export class Range {
    min: number;
    max: number;

    constructor(min: number, max: number) {
        this.min = min;
        this.max = max;
    }

    static from(length: number): Range {
        return new Range(0, length - 1);
    }

    static CUSTOM_SER: {
        TUPLE(range: Range): [number, number];
        NUMBER_OR_TUPLE(
            range: number | Range | undefined,
        ): number | [number, number] | undefined;
        OBJECT(range: Range): { min: number; max: number };
        VALUES_OBJECT(range: Range): { values: { min: number; max: number } };
    } = {
        TUPLE: (range) => [range.min, range.max],
        NUMBER_OR_TUPLE: (range) =>
            range instanceof Range ? [range.min, range.max] : range,
        OBJECT: (range) => ({ min: range.min, max: range.max }),
        VALUES_OBJECT: (range) => ({
            values: { min: range.min, max: range.max },
        }),
    };
}
