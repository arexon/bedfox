/** A range of numbers from `min` to `max`, with `min` and `max` included. */
export class Range {
    min: number;
    max: number;

    constructor(min: number, max: number) {
        this.min = min;
        this.max = max;
    }

    /** Creates a range of `length` numbers that starts at 0. */
    static from(length: number): Range {
        return new Range(0, length - 1);
    }

    toJSON(): [number, number] {
        return this.toTuple();
    }

    /** Returns `[min, max]`. */
    toTuple(): [number, number] {
        return [this.min, this.max];
    }

    /** Returns `{ min, max }`. */
    toObject(): { min: number; max: number } {
        return { min: this.min, max: this.max };
    }

    /** Returns `{ values: { min, max } }`. */
    toValuesObject(): { values: { min: number; max: number } } {
        return { values: this.toObject() };
    }
}
