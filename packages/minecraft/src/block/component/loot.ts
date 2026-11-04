import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component } from "#/component/component";

@serialize
export class LootBlockComponent extends Component {
    static override readonly componentId = "minecraft:loot";

    declare readonly [BRAND]: typeof LootBlockComponent.componentId;

    @serialize({ transparent: true })
    value?: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}
