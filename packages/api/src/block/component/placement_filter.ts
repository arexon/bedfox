import { Component } from "#/core/component";
import type { BlockDescriptorRef, Direction } from "#/primitive/index";
import { serialize } from "#/serialize";

/** Faces and blocks a block may be placed on. */
export interface PlacementCondition {
    allowedFaces?: Direction[];

    blockFilter?: BlockDescriptorRef[];
}

@serialize
export class PlacementFilterBlockComponent extends Component.of("minecraft:placement_filter") {
    conditions: PlacementCondition[] = [];

    constructor(...conditions: PlacementCondition[]) {
        super();
        this.conditions = conditions;
    }
}
