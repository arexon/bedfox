import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
    Range,
    type Reference,
    Relation,
} from "@bedfox/api/common";
import type { Molang } from "@bedfox/api/molang";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { refs } from "../_utils.ts";

const PATH = "minecraft:cave_carver_feature";

@Ser()
export class CaveCarverFeature extends Definition {
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

    constructor(
        identifier: string,
        props?: DefinitionProps<CaveCarverFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _references(): Reference[] {
        return [
            ...refs(Relation.Places, this.fillWith),
        ];
    }
}
