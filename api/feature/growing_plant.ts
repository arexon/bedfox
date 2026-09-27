import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
    Range,
    type Reference,
    Relation,
    type VerticalDirection,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { refs } from "../_utils.ts";

const PATH = "minecraft:growing_plant_feature";

@Ser()
export class GrowingPlantFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({
        path: PATH,
        custom: (v) =>
            v.map((
                [weight, chance],
            ) => [Range.CUSTOM_SER.NUMBER_OR_TUPLE(weight), chance]),
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

    constructor(
        identifier: string,
        props?: DefinitionProps<GrowingPlantFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _references(): Reference[] {
        return [
            ...refs(
                Relation.Places,
                this.bodyBlocks.map(([block]) => block),
                this.headBlocks.map(([block]) => block),
            ),
        ];
    }
}
