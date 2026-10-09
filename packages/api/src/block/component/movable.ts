import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

export type MovementType = "push_pull" | "push" | "popped" | "immovable";

export type StickyType = "none" | "same";

@serialize
export class MovableBlockComponent extends Component.of("minecraft:movable") {
    movementType?: MovementType;

    /** @default "none" */
    sticky?: StickyType;

    constructor(props: ComponentProps<MovableBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
