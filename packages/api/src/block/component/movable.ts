import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

export type MovementType = "push_pull" | "push" | "popped" | "immovable";

export type StickyType = "none" | "same";

@serialize
export class MovableBlockComponent extends Component {
    static override readonly componentId = "minecraft:movable";

    declare readonly [BRAND]: typeof MovableBlockComponent.componentId;

    movementType?: MovementType;

    /** @default "none" */
    sticky?: StickyType;

    constructor(props: ComponentProps<MovableBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
