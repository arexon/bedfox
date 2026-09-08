import { Component } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser()
export class FlowerPottableBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:flower_pottable";
    }
}
