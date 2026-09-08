import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";

const PATH = "minecraft:geode_feature";

@Ser()
export class GeodeFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    filler!: BlockDescriptorRef;

    @Ser({ path: PATH })
    innerLayer!: BlockDescriptorRef;

    @Ser({ path: PATH })
    alternateInnerLayer!: BlockDescriptorRef;

    @Ser({ path: PATH })
    middleLayer!: BlockDescriptorRef;

    @Ser({ path: PATH })
    outerLayer!: BlockDescriptorRef;

    @Ser({ path: PATH })
    innerPlacements?: BlockDescriptorRef[];

    @Ser({ path: PATH })
    minOuterWallDistance!: number;

    @Ser({ path: PATH })
    maxOuterWallDistance!: number;

    @Ser({ path: PATH })
    minDistributionPoints!: number;

    @Ser({ path: PATH })
    maxDistributionPoints!: number;

    @Ser({ path: PATH })
    minPointOffset!: number;

    @Ser({ path: PATH })
    maxPointOffset!: number;

    @Ser({ path: PATH })
    maxRadius!: number;

    @Ser({ path: PATH })
    crackPointOffset!: number;

    @Ser({ path: PATH })
    generateCrackChance!: number;

    @Ser({ path: PATH })
    baseCrackSize!: number;

    @Ser({ path: PATH })
    noiseMultiplier!: number;

    @Ser({ path: PATH })
    usePotentialPlacementsChance!: number;

    @Ser({ path: PATH, rename: "use_alternate_layer0_chance" })
    useAlternateLayer0Chance!: number;

    @Ser({ path: PATH, rename: "placements_require_layer0_alternate" })
    placementsRequireLayer0Alternate!: boolean;

    @Ser({ path: PATH })
    invalidBlocksThreshold!: number;

    constructor(identifier: string, props?: DefinitionProps<GeodeFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _resolveInstances(): Definition[] {
        return [];
    }
}
