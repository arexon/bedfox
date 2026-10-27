import { Block } from "#/block/index";
import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

export interface WeightedBlock {
    weight: number;
    block: BlockDescriptorRef;
}

export interface BlockAttachmentRules {
    minSidesMustAttach?: number;

    autoRotate?: boolean;

    top?: BlockDescriptorRef | BlockDescriptorRef[];

    bottom?: BlockDescriptorRef | BlockDescriptorRef[];

    north?: BlockDescriptorRef | BlockDescriptorRef[];

    east?: BlockDescriptorRef | BlockDescriptorRef[];

    south?: BlockDescriptorRef | BlockDescriptorRef[];

    west?: BlockDescriptorRef | BlockDescriptorRef[];

    all?: BlockDescriptorRef | BlockDescriptorRef[];

    sides?: BlockDescriptorRef | BlockDescriptorRef[];

    diagonal?: BlockDescriptorRef | BlockDescriptorRef[];
}

const ROOT = "minecraft:single_block_feature";

@serialize
export class SingleBlockFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    placesBlock?: BlockDescriptorRef | WeightedBlock[];

    @serialize({ within: ROOT })
    enforcePlacementRules!: boolean;

    @serialize({ within: ROOT })
    enforceSurvivabilityRules!: boolean;

    @serialize({ within: ROOT })
    randomizeRotation?: boolean;

    @serialize({ within: ROOT })
    mayAttachTo?: BlockAttachmentRules;

    @serialize({ within: ROOT })
    mayNotAttachTo?: BlockAttachmentRules;

    @serialize({ within: ROOT })
    mayReplace?: BlockDescriptorRef[];

    constructor(identifier: string, props?: DefinitionProps<SingleBlockFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(
            Block,
            Array.isArray(this.placesBlock)
                ? this.placesBlock.map((weighted) => weighted.block)
                : this.placesBlock,
        );
    }

    override _references(): Reference[] {
        return [
            ...this._placements(),
            ...targets(
                Block,
                this.mayReplace,
                attachmentTargets(this.mayAttachTo),
                attachmentTargets(this.mayNotAttachTo),
            ),
        ];
    }
}

function attachmentTargets(rules: BlockAttachmentRules | undefined): BlockDescriptorRef[] {
    if (rules === undefined) return [];
    const { top, bottom, north, east, south, west, all, sides, diagonal } = rules;
    return [top, bottom, north, east, south, west, all, sides, diagonal]
        .flat()
        .filter((ref) => ref !== undefined);
}
