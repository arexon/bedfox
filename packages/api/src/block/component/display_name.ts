import { Ser } from "@bedfox/serialize";

import { Component } from "#/common/index";

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
