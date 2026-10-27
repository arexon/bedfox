import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import type { Vec3 } from "#/primitive/vec3";
import { serialize } from "#/serialize";

@serialize
export class LeashableBlockComponent extends Component {
    static override readonly componentId = "minecraft:leashable";

    declare readonly [BRAND]: typeof LeashableBlockComponent.componentId;

    /** @default new Vec3(0, 0.25, 0) */
    offset?: Vec3;

    constructor(props: ComponentProps<LeashableBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
