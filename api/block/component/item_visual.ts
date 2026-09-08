import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import type { GeometryBlockComponent } from "./geometry.ts";
import type { MaterialInstancesBlockComponent } from "./material_instances.ts";

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
