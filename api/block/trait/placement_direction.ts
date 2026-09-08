import {
    BlockDescriptor,
    type BlockDescriptorRef,
    CardinalDirection,
} from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";
import { multiAutoInstance } from "../../_utils.ts";
import { BlockTrait, type BlockTraitProps } from "./base.ts";

const Y_ROTATION_OFFSETS = {
    [CardinalDirection.North]: 0,
    [CardinalDirection.East]: 90,
    [CardinalDirection.South]: 180,
    [CardinalDirection.West]: 270,
} satisfies Record<CardinalDirection, number>;

export const enum PlacementDirectionEnabledState {
    CardinalDirection = "minecraft:cardinal_direction",
    CornerAndCardinalDirection = "minecraft:corner_and_cardinal_direction",
    FacingDirection = "minecraft:facing_direction",
    SixteenWayRotation = "minecraft:sixteen_way_rotation",
}

@Ser()
export class PlacementDirectionBlockTrait extends BlockTrait {
    override get traitId(): string {
        return "minecraft:placement_direction";
    }

    @Ser()
    enabledStates: PlacementDirectionEnabledState[] = [];

    @Ser({
        default: () => [],
        custom: (v) =>
            multiAutoInstance(BlockDescriptor, v, (v) => typeof v !== "string"),
    })
    blocksToCornerWith: BlockDescriptorRef[] = [];

    @Ser({
        custom: (v) => v === undefined ? v : Y_ROTATION_OFFSETS[v],
    })
    yRotationOffset?: CardinalDirection;

    constructor(props: BlockTraitProps<PlacementDirectionBlockTrait>) {
        super();
        Object.assign(this, props);
    }
}
