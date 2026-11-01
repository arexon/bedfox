import { serialize } from "@bedfox/core";

import type { GeometryBlockComponent } from "#/block/component/geometry";
import type { MaterialInstancesBlockComponent } from "#/block/component/material_instances";
import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";

@serialize
export class ItemVisualBlockComponent extends Component {
    static override readonly componentId = "minecraft:item_visual";

    declare readonly [BRAND]: typeof ItemVisualBlockComponent.componentId;

    geometry?: string | GeometryBlockComponent;

    materialInstances?: MaterialInstancesBlockComponent;

    constructor(props: ComponentProps<ItemVisualBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
