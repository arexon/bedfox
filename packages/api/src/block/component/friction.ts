import { Ser } from "@bedfox/serialize";

import { Component } from "#/common/index";

@Ser({ transparent: "value" })
export class FrictionBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:friction";
    }

    @Ser()
    value?: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}
