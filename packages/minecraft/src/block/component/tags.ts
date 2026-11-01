import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component } from "#/component/component";

@serialize
export class TagsBlockComponent extends Component {
    static override readonly componentId = "minecraft:tags";

    declare readonly [BRAND]: typeof TagsBlockComponent.componentId;

    @serialize({ transparent: true })
    value?: string[];

    constructor(...value: string[]) {
        super();
        this.value = value;
    }
}
