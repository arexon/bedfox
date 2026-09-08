import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import type { GeometryBlockComponent } from "./geometry.ts";
import type { MaterialInstancesBlockComponent } from "./material_instances.ts";

@Ser()
export class EmbeddedVisualBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:embedded_visual";
    }

    @Ser()
    geometry?: string | GeometryBlockComponent;

    @Ser()
    materialInstances?: MaterialInstancesBlockComponent;

    constructor(props: ComponentProps<EmbeddedVisualBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
