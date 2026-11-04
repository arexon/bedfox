import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component } from "#/component/component";

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
