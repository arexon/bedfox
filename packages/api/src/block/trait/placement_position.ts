import { BlockTrait, type BlockTraitProps } from "#/block/trait/base";
import { serialize } from "#/core/serialize";

export type PlacementPositionEnabledState = "minecraft:block_face" | "minecraft:vertical_half";

@serialize
export class PlacementPositionBlockTrait extends BlockTrait.of("minecraft:placement_position") {
    enabledStates!: PlacementPositionEnabledState[];

    constructor(props: BlockTraitProps<PlacementPositionBlockTrait>) {
        super();
        Object.assign(this, props);
    }
}
