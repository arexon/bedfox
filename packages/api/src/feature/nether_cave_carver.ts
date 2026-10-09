import { Ser } from "@bedfox/serialize";

import { targets } from "#/_utils";
import {
    type BlockDescriptorRef,
    type DefinitionProps,
    Range,
    type ReferenceTarget,
} from "#/common/index";
import { Feature } from "#/feature/base";
import type { Molang } from "#/molang";
import { FormatVersion } from "#/version";

const PATH = "minecraft:nether_cave_carver_feature";

@Ser()
export class NetherCaveCarverFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    fillWith?: BlockDescriptorRef;

    @Ser({ path: PATH })
    widthModifier?: Molang;

    @Ser({ path: PATH })
    skipCarveChance?: number;

    @Ser({ path: PATH })
    heightLimit?: number;

    @Ser({ path: PATH, custom: Range.CUSTOM_SER.NUMBER_OR_TUPLE })
    yScale?: number | Range;

    @Ser({ path: PATH, custom: Range.CUSTOM_SER.NUMBER_OR_TUPLE })
    horizontalRadiusMultiplier?: number | Range;

    @Ser({ path: PATH, custom: Range.CUSTOM_SER.NUMBER_OR_TUPLE })
    verticalRadiusMultiplier?: number | Range;

    @Ser({ path: PATH, custom: Range.CUSTOM_SER.NUMBER_OR_TUPLE })
    floorLevel?: number | Range;

    constructor(identifier: string, props?: DefinitionProps<NetherCaveCarverFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.fillWith);
    }
}
