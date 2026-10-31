import type { BRAND } from "#/core/brand";
import { Component } from "#/core/component";
import { serialize } from "#/serialize";

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
