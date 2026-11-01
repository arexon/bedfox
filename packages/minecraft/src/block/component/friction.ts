import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component } from "#/component/component";

@serialize
export class FrictionBlockComponent extends Component {
    static override readonly componentId = "minecraft:friction";

    declare readonly [BRAND]: typeof FrictionBlockComponent.componentId;

    @serialize({ transparent: true })
    value?: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}
