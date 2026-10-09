import { Ser } from "@bedfox/serialize";

import { autoInstance } from "#/_utils";
import { BoundingBox } from "#/block/component/collision_box";
import { Component } from "#/common/index";

@Ser({ transparent: "value" })
export class SelectionBoxBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:selection_box";
    }

    @Ser({
        default: () => true,
        custom: (v) => autoInstance(BoundingBox, v, (v) => typeof v !== "boolean"),
    })
    value?: boolean | BoundingBox;

    constructor(enabled: boolean);
    constructor(box: BoundingBox);
    constructor(input: boolean | BoundingBox) {
        super();
        this.value = input;
    }
}
