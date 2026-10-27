import type { BRAND } from "#/core/brand";
import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class DisplayNameBlockComponent extends Component {
    static override readonly componentId = "minecraft:display_name";

    declare readonly [BRAND]: typeof DisplayNameBlockComponent.componentId;

    @serialize({ transparent: true })
    value?: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}
