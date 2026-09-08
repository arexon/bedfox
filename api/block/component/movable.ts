import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

export enum MovementType {
    PushPull = "push_pull",
    Push = "push",
    Popped = "popped",
    Immovable = "immovable",
}

export enum StickyType {
    None = "none",
    Same = "same",
}

@Ser()
export class MovableBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:movable";
    }

    @Ser()
    movementType?: MovementType;

    @Ser({ default: () => StickyType.None })
    sticky?: StickyType;

    constructor(props: ComponentProps<MovableBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
