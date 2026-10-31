import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import type { Vec3 } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class TransformationBlockComponent extends Component {
    static override readonly componentId = "minecraft:transformation";

    declare readonly [BRAND]: typeof TransformationBlockComponent.componentId;

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
