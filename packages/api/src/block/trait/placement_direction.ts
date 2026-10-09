import { BlockTrait, type BlockTraitProps } from "#/block/trait/base";
import { serialize } from "#/core/serialize";
import type { BlockDescriptorRef, CardinalDirection } from "#/primitive/index";

const Y_ROTATION_OFFSETS = {
    ["north"]: 0,
    ["east"]: 90,
    ["south"]: 180,
    ["west"]: 270,
} satisfies Record<CardinalDirection, number>;

export type PlacementDirectionEnabledState =
    | "minecraft:cardinal_direction"
    | "minecraft:corner_and_cardinal_direction"
    | "minecraft:facing_direction"
    | "minecraft:sixteen_way_rotation";

@serialize
export class PlacementDirectionBlockTrait extends BlockTrait.of("minecraft:placement_direction") {
    enabledStates?: PlacementDirectionEnabledState[] = [];

    blocksToCornerWith?: BlockDescriptorRef[] = [];

    @serialize({
        override: (direction?: CardinalDirection) => direction && Y_ROTATION_OFFSETS[direction],
    })
    yRotationOffset?: CardinalDirection;

    constructor(props: BlockTraitProps<PlacementDirectionBlockTrait>) {
        super();
        Object.assign(this, props);
    }
}
