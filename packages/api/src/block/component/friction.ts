import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class FrictionBlockComponent extends Component.of("minecraft:friction") {
    @serialize({ transparent: true })
    value?: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}
