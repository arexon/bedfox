import { Ser } from "@bedfox/serialize";

import { Component } from "#/common/index";

@Ser({ transparent: "value" })
export class LightDampeningBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:light_dampening";
    }

    @Ser()
    value?: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}
