import { type Reference, serialize } from "@bedfox/core";

import { Block } from "#/block/index";
import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion, type Molang, Range } from "#/primitive/index";
import { targets } from "#/references";

const ROOT = "minecraft:nether_cave_carver_feature";

@serialize
export class NetherCaveCarverFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    fillWith?: BlockDescriptorRef;

    @serialize({ within: ROOT })
    widthModifier?: Molang;

    @serialize({ within: ROOT })
    skipCarveChance?: number;

    @serialize({ within: ROOT })
    heightLimit?: number;

    @serialize({ within: ROOT })
    yScale?: number | Range;

    @serialize({ within: ROOT })
    horizontalRadiusMultiplier?: number | Range;

    @serialize({ within: ROOT })
    verticalRadiusMultiplier?: number | Range;

    @serialize({ within: ROOT })
    floorLevel?: number | Range;

    constructor(identifier: string, props?: DefinitionProps<NetherCaveCarverFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override placements(): Reference[] {
        return targets(Block, this.fillWith);
    }
}
