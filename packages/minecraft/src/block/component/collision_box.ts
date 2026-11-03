import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component } from "#/component/component";
import { Vec3 } from "#/primitive/index";

/** A box in block-space pixels: `origin` is its minimum corner. */
export interface BoundingBox {
    origin: Vec3;
    size: Vec3;
}

@serialize
export class CollisionBoxBlockComponent extends Component {
    static override readonly componentId = "minecraft:collision_box";

    declare readonly [BRAND]: typeof CollisionBoxBlockComponent.componentId;

    // TODO: Add min/max
    @serialize({ transparent: true })
    value!: boolean | BoundingBox[];

    constructor(enabled: boolean);
    constructor(box: BoundingBox, ...boxes: BoundingBox[]);
    constructor(first: boolean | BoundingBox, ...rest: BoundingBox[]) {
        super();
        if (typeof first === "boolean") this.value = first;
        else this.value = [first, ...rest];
    }

    addBox(...boxes: BoundingBox[]): this {
        if (Array.isArray(this.value)) this.value.push(...boxes);
        else this.value = boxes;
        return this;
    }
}
