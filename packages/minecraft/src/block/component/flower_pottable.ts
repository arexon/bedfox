import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component } from "#/component/component";

@serialize
export class FlowerPottableBlockComponent extends Component {
    static override readonly componentId = "minecraft:flower_pottable";

    declare readonly [BRAND]: typeof FlowerPottableBlockComponent.componentId;
}
