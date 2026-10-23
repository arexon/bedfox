import { Component, type ComponentProps } from "#/core/component";
import type { Vec3 } from "#/primitive/vec3";
import { serialize } from "#/serialize";

@serialize
export class TransformationBlockComponent extends Component.of("minecraft:transformation") {
    /** @default new Vec3(0, 0, 0) */
    translation?: Vec3;

    /** @default new Vec3(1, 1, 1) */
    scale?: Vec3;

    /** @default new Vec3(0, 0, 0) */
    scalePivot?: Vec3;

    /** @default new Vec3(0, 0, 0) */
    rotation?: Vec3;

    /** @default new Vec3(0, 0, 0) */
    rotationPivot?: Vec3;

    constructor(props: ComponentProps<TransformationBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
