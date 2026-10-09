import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";
import type { Vec3 } from "#/primitive/vec3";

@serialize
export class LeashableBlockComponent extends Component.of("minecraft:leashable") {
    /** @default new Vec3(0, 0.25, 0) */
    offset?: Vec3;

    constructor(props: ComponentProps<LeashableBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
