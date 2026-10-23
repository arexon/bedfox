import { BlockTrait, type BlockTraitProps } from "#/block/trait/base";
import type { Direction } from "#/primitive/index";
import { serialize } from "#/serialize";

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
