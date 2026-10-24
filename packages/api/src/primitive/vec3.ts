export class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /** Serializes as an `[x, y, z]` tuple. */
    toJSON(): [number, number, number] {
        return this.toTuple();
    }

    /** An `[x, y, z]` tuple. */
    toTuple(): [number, number, number] {
        return [this.x, this.y, this.z];
    }
}
