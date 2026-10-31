import { BlockTrait, type BlockTraitProps } from "#/block/trait/base";
import type { BRAND } from "#/core/brand";
import { serialize } from "#/serialize";

export type PlacementPositionEnabledState = "minecraft:block_face" | "minecraft:vertical_half";

@serialize
export class PlacementPositionBlockTrait extends BlockTrait {
    static override readonly traitId = "minecraft:placement_position";

    declare readonly [BRAND]: typeof PlacementPositionBlockTrait.traitId;

    enabledStates!: PlacementPositionEnabledState[];

    constructor(props: BlockTraitProps<PlacementPositionBlockTrait>) {
        super();
        Object.assign(this, props);
    }
}
