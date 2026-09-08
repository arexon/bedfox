import { Ser } from "@bedfox/serialize";
import { BlockTrait, type BlockTraitProps } from "./base.ts";

export const enum PlacementPositionEnabledState {
    BlockFace = "minecraft:block_face",
    VerticalHalf = "minecraft:vertical_half",
}

@Ser()
export class PlacementPositionBlockTrait extends BlockTrait {
    override get traitId(): string {
        return "minecraft:placement_position";
    }

    @Ser()
    enabledStates!: PlacementPositionEnabledState[];

    constructor(props: BlockTraitProps<PlacementPositionBlockTrait>) {
        super();
        Object.assign(this, props);
    }
}
