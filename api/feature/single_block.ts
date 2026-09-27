import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
    type Reference,
    Relation,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { refs } from "../_utils.ts";

@Ser()
export class WeightedBlock {
    @Ser()
    weight: number;

    @Ser()
    block: BlockDescriptorRef;

    constructor(block: BlockDescriptorRef, weight: number) {
        this.block = block;
        this.weight = weight;
    }
}

@Ser()
export class BlockAttachmentRules {
    @Ser()
    minSidesMustAttach?: number;

    @Ser()
    autoRotate?: boolean;

    @Ser()
    top?: BlockDescriptorRef | BlockDescriptorRef[];

    @Ser()
    bottom?: BlockDescriptorRef | BlockDescriptorRef[];

    @Ser()
    north?: BlockDescriptorRef | BlockDescriptorRef[];

    @Ser()
    east?: BlockDescriptorRef | BlockDescriptorRef[];

    @Ser()
    south?: BlockDescriptorRef | BlockDescriptorRef[];

    @Ser()
    west?: BlockDescriptorRef | BlockDescriptorRef[];

    @Ser()
    all?: BlockDescriptorRef | BlockDescriptorRef[];

    @Ser()
    sides?: BlockDescriptorRef | BlockDescriptorRef[];

    @Ser()
    diagonal?: BlockDescriptorRef | BlockDescriptorRef[];

    constructor(props: BlockAttachmentRules) {
        Object.assign(this, props);
    }
}

const PATH = "minecraft:single_block_feature";

@Ser()
export class SingleBlockFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    placesBlock?: BlockDescriptorRef | WeightedBlock[];

    @Ser({ path: PATH })
    enforcePlacementRules!: boolean;

    @Ser({ path: PATH })
    enforceSurvivabilityRules!: boolean;

    @Ser({ path: PATH })
    randomizeRotation?: boolean;

    @Ser({ path: PATH })
    mayAttachTo?: BlockAttachmentRules;

    @Ser({ path: PATH })
    mayNotAttachTo?: BlockAttachmentRules;

    @Ser({ path: PATH })
    mayReplace?: BlockDescriptorRef[];

    constructor(
        identifier: string,
        props?: DefinitionProps<SingleBlockFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _references(): Reference[] {
        return [
            ...refs(
                Relation.Places,
                Array.isArray(this.placesBlock)
                    ? this.placesBlock.map((weighted) => weighted.block)
                    : this.placesBlock,
            ),
            ...refs(
                Relation.Requires,
                this.mayReplace,
                attachmentTargets(this.mayAttachTo),
                attachmentTargets(this.mayNotAttachTo),
            ),
        ];
    }
}

function attachmentTargets(
    rules: BlockAttachmentRules | undefined,
): BlockDescriptorRef[] {
    if (rules === undefined) return [];
    const { top, bottom, north, east, south, west, all, sides, diagonal } =
        rules;
    return [top, bottom, north, east, south, west, all, sides, diagonal]
        .flat()
        .filter((ref) => ref !== undefined);
}
