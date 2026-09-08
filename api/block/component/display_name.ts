import { Component } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser({ transparent: "value" })
export class DisplayNameBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:display_name";
    }

    @Ser()
    value?: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}
