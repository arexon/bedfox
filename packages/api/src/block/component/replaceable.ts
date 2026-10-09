import { Ser } from "@bedfox/serialize";

import { Component } from "#/common/index";

@Ser()
export class ReplaceableBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:replaceable";
    }
}
