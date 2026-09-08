import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
    Range,
} from "@bedfox/api/common";
import type { Molang } from "@bedfox/api/molang";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";

const PATH = "minecraft:underwater_cave_carver_feature";

@Ser()
export class UnderwaterCaveCarverFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    replaceAirWith?: BlockDescriptorRef;

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

    constructor(
        identifier: string,
        props?: DefinitionProps<UnderwaterCaveCarverFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _resolveInstances(): Definition[] {
        return [];
    }
}
