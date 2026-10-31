import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import type { Direction } from "#/primitive/index";
import { serialize } from "#/serialize";

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
