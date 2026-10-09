import { Ser } from "@bedfox/serialize";

import { Component } from "#/common/index";

@Ser()
export class FlowerPottableBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:flower_pottable";
    }
}
