export class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static CUSTOM_SER: {
        TUPLE(vec: Vec3): [number, number, number];
    } = {
        TUPLE: (vec) => [vec.x, vec.y, vec.z],
    };
}
