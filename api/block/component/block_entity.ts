import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import { autoInstance } from "../../_utils.ts";

@Ser()
export class BlockContainer {
    @Ser()
    slotCount?: number;

    constructor(props: BlockContainer) {
        Object.assign(this, props);
    }
}

@Ser()
export class BlockEntityBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:block_entity";
    }

    @Ser({ default: () => false })
    dynamicProperties?: boolean;

    @Ser({ custom: (v) => autoInstance(BlockContainer, v) })
    container?: BlockContainer;

    constructor(props: ComponentProps<BlockEntityBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
