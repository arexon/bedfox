import { Component } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser()
export class ReplaceableBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:replaceable";
    }
}
