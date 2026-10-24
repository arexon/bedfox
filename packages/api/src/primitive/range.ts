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

    toJSON(): [number, number] {
        return this.toTuple();
    }

    toTuple(): [number, number] {
        return [this.min, this.max];
    }

    toObject(): { min: number; max: number } {
        return { min: this.min, max: this.max };
    }

    toValuesObject(): { values: { min: number; max: number } } {
        return { values: this.toObject() };
    }
}
