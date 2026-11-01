import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component } from "#/component/component";
import type { BlockDescriptorRef, Direction } from "#/primitive/index";

/** Faces and blocks a block may be placed on. */
export interface PlacementCondition {
    allowedFaces?: Direction[];

    blockFilter?: BlockDescriptorRef[];
}

@serialize
export class PlacementFilterBlockComponent extends Component {
    static override readonly componentId = "minecraft:placement_filter";

    declare readonly [BRAND]: typeof PlacementFilterBlockComponent.componentId;

    conditions: PlacementCondition[] = [];

    constructor(...conditions: PlacementCondition[]) {
        super();
        this.conditions = conditions;
    }
}
