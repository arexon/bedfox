import { BlockTrait, type BlockTraitProps } from "#/block/trait/base";
import { serialize } from "#/core/serialize";
import type { Direction } from "#/primitive/index";

export type MultiBlockEnabledState = "minecraft:multi_block_part";

@serialize
export class MultiBlockBlockTrait extends BlockTrait.of("minecraft:multi_block") {
    enabledStates!: MultiBlockEnabledState[];

    direction!: Direction;

    /** @default 2 */
    parts?: number;

    constructor(props: BlockTraitProps<MultiBlockBlockTrait>) {
        super();
        Object.assign(this, props);
    }
}
