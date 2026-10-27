import { Block } from "#/block/index";
import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion, type Molang, Range } from "#/primitive/index";
import { serialize } from "#/serialize";

const ROOT = "minecraft:cave_carver_feature";

@serialize
export class CaveCarverFeature extends Feature {
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

    constructor(identifier: string, props?: DefinitionProps<CaveCarverFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Block, this.fillWith);
    }
}
