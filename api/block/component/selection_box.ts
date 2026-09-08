import { Component } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import { autoInstance } from "../../_utils.ts";
import { BoundingBox } from "./collision_box.ts";

@Ser({ transparent: "value" })
export class SelectionBoxBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:selection_box";
    }

    @Ser({
        default: () => true,
        custom: (v) =>
            autoInstance(BoundingBox, v, (v) => typeof v !== "boolean"),
    })
    value?: boolean | BoundingBox;

    constructor(enabled: boolean);
    constructor(box: BoundingBox);
    constructor(input: boolean | BoundingBox) {
        super();
        this.value = input;
    }
}
