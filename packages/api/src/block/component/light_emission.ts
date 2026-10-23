import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class LightEmissionBlockComponent extends Component.of("minecraft:light_emission") {
    @serialize({ transparent: true })
    value?: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}
