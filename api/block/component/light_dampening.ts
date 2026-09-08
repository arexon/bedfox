import { Component } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

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
