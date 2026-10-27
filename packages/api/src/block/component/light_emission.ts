import type { BRAND } from "#/core/brand";
import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class LightEmissionBlockComponent extends Component {
    static override readonly componentId = "minecraft:light_emission";

    declare readonly [BRAND]: typeof LightEmissionBlockComponent.componentId;

    @serialize({ transparent: true })
    value?: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}
