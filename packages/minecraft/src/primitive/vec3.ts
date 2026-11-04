/** A vector with `x`, `y` and `z` numbers. */
export class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toJSON(): [number, number, number] {
        return this.toTuple();
    }

    /** Returns `[x, y, z]`. */
    toTuple(): [number, number, number] {
        return [this.x, this.y, this.z];
    }
}
