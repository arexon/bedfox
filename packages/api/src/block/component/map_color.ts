import type { TintMethod } from "#/block/component/material_instances";
import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { Color } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class MapColorBlockComponent extends Component {
    static override readonly componentId = "minecraft:map_color";

    declare readonly [BRAND]: typeof MapColorBlockComponent.componentId;

    @serialize({ transparent: true })
    color?: Color;

    /** @default "none" */
    tintMethod?: TintMethod;

    constructor(color: Color);
    constructor(props: ComponentProps<MapColorBlockComponent>);
    constructor(input: Color | ComponentProps<MapColorBlockComponent>) {
        super();
        if (input instanceof Color) {
            this.color = input;
        } else {
            Object.assign(this, input);
        }
    }
}
