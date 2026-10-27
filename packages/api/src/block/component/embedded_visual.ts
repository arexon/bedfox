import type { GeometryBlockComponent } from "#/block/component/geometry";
import type { MaterialInstancesBlockComponent } from "#/block/component/material_instances";
import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class EmbeddedVisualBlockComponent extends Component {
    static override readonly componentId = "minecraft:embedded_visual";

    declare readonly [BRAND]: typeof EmbeddedVisualBlockComponent.componentId;

    geometry?: string | GeometryBlockComponent;

    materialInstances?: MaterialInstancesBlockComponent;

    constructor(props: ComponentProps<EmbeddedVisualBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
