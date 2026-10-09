import { Ser } from "@bedfox/serialize";

import type { GeometryBlockComponent } from "#/block/component/geometry";
import type { MaterialInstancesBlockComponent } from "#/block/component/material_instances";
import { Component, type ComponentProps } from "#/common/index";

@Ser()
export class ItemVisualBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:item_visual";
    }

    @Ser()
    geometry?: string | GeometryBlockComponent;

    @Ser()
    materialInstances?: MaterialInstancesBlockComponent;

    constructor(props: ComponentProps<ItemVisualBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
