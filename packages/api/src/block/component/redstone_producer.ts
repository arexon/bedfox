import { Component, type ComponentProps } from "#/core/component";
import type { Direction } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class RedstoneProducerBlockComponent extends Component.of("minecraft:redstone_producer") {
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
