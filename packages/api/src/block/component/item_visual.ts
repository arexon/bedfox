import type { GeometryBlockComponent } from "#/block/component/geometry";
import type { MaterialInstancesBlockComponent } from "#/block/component/material_instances";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class ItemVisualBlockComponent extends Component.of("minecraft:item_visual") {
    geometry?: string | GeometryBlockComponent;

    materialInstances?: MaterialInstancesBlockComponent;

    constructor(props: ComponentProps<ItemVisualBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
