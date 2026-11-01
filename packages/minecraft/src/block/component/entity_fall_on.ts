import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";

@serialize
export class EntityFallOnBlockComponent extends Component {
    static override readonly componentId = "minecraft:entity_fall_on";

    declare readonly [BRAND]: typeof EntityFallOnBlockComponent.componentId;

    /** @default 0 */
    minFallDistance?: number;

    constructor(props: ComponentProps<EntityFallOnBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
