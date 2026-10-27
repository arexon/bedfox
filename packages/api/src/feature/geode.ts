import { Block } from "#/block/index";
import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

const ROOT = "minecraft:geode_feature";

@serialize
export class GeodeFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    filler!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    innerLayer!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    alternateInnerLayer!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    middleLayer!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    outerLayer!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    innerPlacements?: BlockDescriptorRef[];

    @serialize({ within: ROOT })
    minOuterWallDistance!: number;

    @serialize({ within: ROOT })
    maxOuterWallDistance!: number;

    @serialize({ within: ROOT })
    minDistributionPoints!: number;

    @serialize({ within: ROOT })
    maxDistributionPoints!: number;

    @serialize({ within: ROOT })
    minPointOffset!: number;

    @serialize({ within: ROOT })
    maxPointOffset!: number;

    @serialize({ within: ROOT })
    maxRadius!: number;

    @serialize({ within: ROOT })
    crackPointOffset!: number;

    @serialize({ within: ROOT })
    generateCrackChance!: number;

    @serialize({ within: ROOT })
    baseCrackSize!: number;

    @serialize({ within: ROOT })
    noiseMultiplier!: number;

    @serialize({ within: ROOT })
    usePotentialPlacementsChance!: number;

    @serialize({ within: ROOT })
    useAlternateLayer0Chance!: number;

    @serialize({ within: ROOT })
    placementsRequireLayer0Alternate!: boolean;

    @serialize({ within: ROOT })
    invalidBlocksThreshold!: number;

    constructor(identifier: string, props?: DefinitionProps<GeodeFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(
            Block,
            this.filler,
            this.innerLayer,
            this.alternateInnerLayer,
            this.middleLayer,
            this.outerLayer,
            this.innerPlacements,
        );
    }
}
