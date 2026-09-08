import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
    Range,
} from "@bedfox/api/common";
import type { FeatureReference } from "@bedfox/api/feature";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier } from "../_utils.ts";

export enum VegetationPatchSurface {
    Floor = "floor",
    Ceiling = "ceiling",
}

const PATH = "minecraft:vegetation_patch_feature";

@Ser()
export class VegetationPatchFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    replaceableBlocks!: BlockDescriptorRef[];

    @Ser({ path: PATH })
    groundBlock!: BlockDescriptorRef;

    @Ser({ path: PATH, custom: autoIdentifier })
    vegetationFeature!: FeatureReference;

    @Ser({ path: PATH })
    surface?: VegetationPatchSurface;

    @Ser({ path: PATH, custom: Range.CUSTOM_SER.NUMBER_OR_TUPLE })
    depth!: number | Range;

    @Ser({ path: PATH })
    extraDeepBlockChance?: number;

    @Ser({ path: PATH })
    verticalRange!: number;

    @Ser({ path: PATH })
    vegetationChance?: number;

    @Ser({ path: PATH, custom: Range.CUSTOM_SER.NUMBER_OR_TUPLE })
    horizontalRadius!: number | Range;

    @Ser({ path: PATH })
    extraEdgeColumnChance?: number;

    @Ser({ path: PATH })
    waterlogged?: boolean;

    constructor(
        identifier: string,
        props?: DefinitionProps<VegetationPatchFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _resolveInstances(): Definition[] {
        return typeof this.vegetationFeature === "string"
            ? []
            : [this.vegetationFeature];
    }
}
