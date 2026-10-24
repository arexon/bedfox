import { Block } from "#/block/index";
import type { DefinitionProps, Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import {
    type BlockDescriptorRef,
    FormatVersion,
    Range,
    type VerticalDirection,
} from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class GrowingPlantFeature extends Feature.of(
    "minecraft:growing_plant_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    heightDistribution!: [number | Range, number][];

    growthDirection!: VerticalDirection;

    age?: number | Range;

    bodyBlocks!: [BlockDescriptorRef, number][];

    headBlocks!: [BlockDescriptorRef, number][];

    allowWater?: boolean;

    constructor(identifier: string, props?: DefinitionProps<GrowingPlantFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(
            Block,
            this.bodyBlocks.map(([block]) => block),
            this.headBlocks.map(([block]) => block),
        );
    }
}
