import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class LootBlockComponent extends Component.of("minecraft:loot") {
    @serialize({ transparent: true })
    value?: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}
