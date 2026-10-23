import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
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

@serialize
export class SingleBlockFeature extends Feature.of(
    "minecraft:single_block_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    placesBlock?: BlockDescriptorRef | WeightedBlock[];

    enforcePlacementRules!: boolean;

    enforceSurvivabilityRules!: boolean;

    randomizeRotation?: boolean;

    mayAttachTo?: BlockAttachmentRules;

    mayNotAttachTo?: BlockAttachmentRules;

    mayReplace?: BlockDescriptorRef[];

    constructor(identifier: string, props?: DefinitionProps<SingleBlockFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(
            Array.isArray(this.placesBlock)
                ? this.placesBlock.map((weighted) => weighted.block)
                : this.placesBlock,
        );
    }

    override _references(): ReferenceTarget[] {
        return targets(
            this._placements(),
            this.mayReplace,
            attachmentTargets(this.mayAttachTo),
            attachmentTargets(this.mayNotAttachTo),
        );
    }
}

function attachmentTargets(rules: BlockAttachmentRules | undefined): BlockDescriptorRef[] {
    if (rules === undefined) return [];
    const { top, bottom, north, east, south, west, all, sides, diagonal } = rules;
    return [top, bottom, north, east, south, west, all, sides, diagonal]
        .flat()
        .filter((ref) => ref !== undefined);
}
