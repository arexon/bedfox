import { Component } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser({ transparent: "value" })
export class LightEmissionBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:light_emission";
    }

    @Ser()
    value?: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}
