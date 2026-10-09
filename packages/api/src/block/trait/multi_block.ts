import { Ser } from "@bedfox/serialize";

import { BlockTrait, type BlockTraitProps } from "#/block/trait/base";
import type { Direction } from "#/common/index";

export const enum MultiBlockEnabledState {
    MultiBlockPart = "minecraft:multi_block_part",
}

@Ser()
export class MultiBlockBlockTrait extends BlockTrait {
    override get traitId(): string {
        return "minecraft:multi_block";
    }

    @Ser()
    enabledStates!: MultiBlockEnabledState[];

    @Ser()
    direction!: Direction;

    @Ser({ default: () => 2 })
    parts?: number;

    constructor(props: BlockTraitProps<MultiBlockBlockTrait>) {
        super();
        Object.assign(this, props);
    }
}
