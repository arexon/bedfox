import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { serialize } from "#/core/serialize";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion, type Molang, Range } from "#/primitive/index";

@serialize
export class CaveCarverFeature extends Feature.of(
    "minecraft:cave_carver_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    fillWith?: BlockDescriptorRef;

    widthModifier?: Molang;

    skipCarveChance?: number;

    heightLimit?: number;

    yScale?: number | Range;

    horizontalRadiusMultiplier?: number | Range;

    verticalRadiusMultiplier?: number | Range;

    floorLevel?: number | Range;

    constructor(identifier: string, props?: DefinitionProps<CaveCarverFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.fillWith);
    }
}
