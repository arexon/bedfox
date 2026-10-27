import type { GeometryBlockComponent } from "#/block/component/geometry";
import type { MaterialInstancesBlockComponent } from "#/block/component/material_instances";
import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

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
