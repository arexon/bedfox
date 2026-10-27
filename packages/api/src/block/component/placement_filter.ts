import type { BRAND } from "#/core/brand";
import { Component } from "#/core/component";
import type { BlockDescriptorRef, Direction } from "#/primitive/index";
import { serialize } from "#/serialize";

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
