import { Ser } from "@bedfox/serialize";

import { Component } from "#/common/index";

@Ser({ transparent: "value" })
export class LootBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:loot";
    }

    @Ser()
    value?: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}
