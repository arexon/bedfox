import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";
import type { Vec3 } from "#/primitive/index";

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
