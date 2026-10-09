import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps, Direction } from "#/common/index";

@Ser()
export class RedstoneProducerBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:redstone_producer";
    }

    @Ser()
    power?: number;

    @Ser()
    stronglyPoweredFace?: Direction;

    @Ser({
        default: () => [
            Direction.Down,
            Direction.Up,
            Direction.North,
            Direction.South,
            Direction.West,
            Direction.East,
        ],
    })
    connectedFaces?: Direction[];

    @Ser({ default: () => true })
    transformRelative?: boolean;

    constructor(props: ComponentProps<RedstoneProducerBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
