import type { BRAND } from "#/core/brand";
import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class FlowerPottableBlockComponent extends Component {
    static override readonly componentId = "minecraft:flower_pottable";

    declare readonly [BRAND]: typeof FlowerPottableBlockComponent.componentId;
}
