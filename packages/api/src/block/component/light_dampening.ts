import type { BRAND } from "#/core/brand";
import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class LightDampeningBlockComponent extends Component {
    static override readonly componentId = "minecraft:light_dampening";

    declare readonly [BRAND]: typeof LightDampeningBlockComponent.componentId;

    @serialize({ transparent: true })
    value?: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}
