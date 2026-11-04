import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component } from "#/component/component";

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
