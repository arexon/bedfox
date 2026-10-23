import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

export interface BlockContainer {
    slotCount?: number;
}

@serialize
export class BlockEntityBlockComponent extends Component.of("minecraft:block_entity") {
    /** @default false */
    dynamicProperties?: boolean;

    container?: BlockContainer;

    /** @default false */
    entityStorage?: boolean;

    constructor(props: ComponentProps<BlockEntityBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
