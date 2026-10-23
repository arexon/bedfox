import { Component } from "#/core/component";
import { Vec3 } from "#/primitive/vec3";
import { serialize } from "#/serialize";

/** A box in block-space pixels: `origin` is its minimum corner. */
export interface BoundingBox {
    origin: Vec3;
    size: Vec3;
}

/** Common {@link BoundingBox} shapes. */
export const BoundingBox = {
    /** A full 16×16×16 block. */
    cube(): BoundingBox {
        return { origin: new Vec3(-8, 0, -8), size: new Vec3(16, 16, 16) };
    },

    /** A bottom slab, 16×8×16. */
    slab(): BoundingBox {
        return { origin: new Vec3(-8, 0, -8), size: new Vec3(16, 8, 16) };
    },
};

@serialize
export class CollisionBoxBlockComponent extends Component.of("minecraft:collision_box") {
    // TODO: Add min/max
    /** `true` for a full block, `false` for no collision, or one or more boxes. */
    @serialize({ transparent: true })
    value!: boolean | BoundingBox[];

    constructor(enabled: boolean);
    constructor(box: BoundingBox, ...boxes: BoundingBox[]);
    constructor(first: boolean | BoundingBox, ...rest: BoundingBox[]) {
        super();
        if (typeof first !== "boolean") this.value = [first, ...rest];
        else this.value = first;
    }

    addBox(...boxes: BoundingBox[]): this {
        if (Array.isArray(this.value)) this.value.push(...boxes);
        else this.value = boxes;
        return this;
    }
}
