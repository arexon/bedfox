import type { BoundingBox } from "#/block/component/collision_box";
import { Component } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class SelectionBoxBlockComponent extends Component.of("minecraft:selection_box") {
    /** `true` for a full block, `false` for none, or a single box. */
    @serialize({ transparent: true })
    value?: boolean | BoundingBox;

    constructor(enabled: boolean);
    constructor(box: BoundingBox);
    constructor(input: boolean | BoundingBox) {
        super();
        this.value = input;
    }
}
