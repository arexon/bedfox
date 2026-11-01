import { type Reference, serialize } from "@bedfox/core";

import { Block } from "#/block/index";
import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import {
    type BlockDescriptorRef,
    FormatVersion,
    Range,
    type VerticalDirection,
} from "#/primitive/index";
import { targets } from "#/references";

const ROOT = "minecraft:growing_plant_feature";

@serialize
export class GrowingPlantFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    heightDistribution!: [number | Range, number][];

    @serialize({ within: ROOT })
    growthDirection!: VerticalDirection;

    @serialize({ within: ROOT })
    age?: number | Range;

    @serialize({ within: ROOT })
    bodyBlocks!: [BlockDescriptorRef, number][];

    @serialize({ within: ROOT })
    headBlocks!: [BlockDescriptorRef, number][];

    @serialize({ within: ROOT })
    allowWater?: boolean;

    constructor(identifier: string, props?: DefinitionProps<GrowingPlantFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override placements(): Reference[] {
        return targets(
            Block,
            this.bodyBlocks.map(([block]) => block),
            this.headBlocks.map(([block]) => block),
        );
    }
}
