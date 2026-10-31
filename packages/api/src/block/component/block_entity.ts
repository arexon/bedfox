import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

export interface BlockContainer {
    slotCount?: number;
}

@serialize
export class BlockEntityBlockComponent extends Component {
    static override readonly componentId = "minecraft:block_entity";

    declare readonly [BRAND]: typeof BlockEntityBlockComponent.componentId;

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
