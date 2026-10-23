import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class LightDampeningBlockComponent extends Component.of("minecraft:light_dampening") {
    @serialize({ transparent: true })
    value?: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}
