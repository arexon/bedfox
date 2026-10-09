import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { serialize } from "#/core/serialize";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";

@serialize
export class GeodeFeature extends Feature.of(
    "minecraft:geode_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    filler!: BlockDescriptorRef;

    innerLayer!: BlockDescriptorRef;

    alternateInnerLayer!: BlockDescriptorRef;

    middleLayer!: BlockDescriptorRef;

    outerLayer!: BlockDescriptorRef;

    innerPlacements?: BlockDescriptorRef[];

    minOuterWallDistance!: number;

    maxOuterWallDistance!: number;

    minDistributionPoints!: number;

    maxDistributionPoints!: number;

    minPointOffset!: number;

    maxPointOffset!: number;

    maxRadius!: number;

    crackPointOffset!: number;

    generateCrackChance!: number;

    baseCrackSize!: number;

    noiseMultiplier!: number;

    usePotentialPlacementsChance!: number;

    useAlternateLayer0Chance!: number;

    placementsRequireLayer0Alternate!: boolean;

    invalidBlocksThreshold!: number;

    constructor(identifier: string, props?: DefinitionProps<GeodeFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(
            this.filler,
            this.innerLayer,
            this.alternateInnerLayer,
            this.middleLayer,
            this.outerLayer,
            this.innerPlacements,
        );
    }
}
