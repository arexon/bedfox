import { Ser } from "@bedfox/serialize";

import { targets } from "#/_utils";
import {
    type BlockDescriptorRef,
    type DefinitionProps,
    Range,
    type ReferenceTarget,
    type VerticalDirection,
} from "#/common/index";
import { Feature } from "#/feature/base";
import { FormatVersion } from "#/version";

const PATH = "minecraft:growing_plant_feature";

@Ser()
export class GrowingPlantFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({
        path: PATH,
        custom: (v) =>
            v.map(([weight, chance]) => [Range.CUSTOM_SER.NUMBER_OR_TUPLE(weight), chance]),
    })
    heightDistribution!: [number | Range, number][];

    @Ser({ path: PATH })
    growthDirection!: VerticalDirection;

    @Ser({ path: PATH, custom: Range.CUSTOM_SER.NUMBER_OR_TUPLE })
    age?: number | Range;

    @Ser({ path: PATH })
    bodyBlocks!: [BlockDescriptorRef, number][];

    @Ser({ path: PATH })
    headBlocks!: [BlockDescriptorRef, number][];

    @Ser({ path: PATH })
    allowWater?: boolean;

    constructor(identifier: string, props?: DefinitionProps<GrowingPlantFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(
            this.bodyBlocks.map(([block]) => block),
            this.headBlocks.map(([block]) => block),
        );
    }
}
