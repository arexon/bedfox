import { Component } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

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
