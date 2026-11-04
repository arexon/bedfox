import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";
import type { Direction } from "#/primitive/index";

@serialize
export class RedstoneProducerBlockComponent extends Component {
    static override readonly componentId = "minecraft:redstone_producer";

    declare readonly [BRAND]: typeof RedstoneProducerBlockComponent.componentId;

    power?: number;

    stronglyPoweredFace?: Direction;

    /** @default ["north", "east", "south", "west", "up", "down"] */
    connectedFaces?: Direction[];

    /** @default true */
    transformRelative?: boolean;

    constructor(props: ComponentProps<RedstoneProducerBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
