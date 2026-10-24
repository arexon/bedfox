import type { BoundingBox } from "#/block/component/collision_box";
import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class SelectionBoxBlockComponent extends Component.of("minecraft:selection_box") {
    @serialize({ transparent: true })
    value?: boolean | BoundingBox;

    constructor(enabled: boolean);
    constructor(box: BoundingBox);
    constructor(input: boolean | BoundingBox) {
        super();
        this.value = input;
    }
}
