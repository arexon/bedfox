import { Component } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

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
