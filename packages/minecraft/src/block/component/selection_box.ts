import { serialize } from "@bedfox/core";

import type { BoundingBox } from "#/block/component/collision_box";
import type { BRAND } from "#/brand";
import { Component } from "#/component/component";

@serialize
export class SelectionBoxBlockComponent extends Component {
    static override readonly componentId = "minecraft:selection_box";

    declare readonly [BRAND]: typeof SelectionBoxBlockComponent.componentId;

    @serialize({ transparent: true })
    value?: boolean | BoundingBox;

    constructor(enabled: boolean);
    constructor(box: BoundingBox);
    constructor(input: boolean | BoundingBox) {
        super();
        this.value = input;
    }
}
