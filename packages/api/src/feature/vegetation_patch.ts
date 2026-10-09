import { Ser } from "@bedfox/serialize";

import { autoIdentifier, targets } from "#/_utils";
import {
    type BlockDescriptorRef,
    type DefinitionProps,
    Range,
    type ReferenceTarget,
} from "#/common/index";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/index";
import { FormatVersion } from "#/version";

export enum VegetationPatchSurface {
    Floor = "floor",
    Ceiling = "ceiling",
}

const PATH = "minecraft:vegetation_patch_feature";

@Ser()
export class VegetationPatchFeature extends Feature {
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

    constructor(identifier: string, props?: DefinitionProps<VegetationPatchFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.vegetationFeature, this.groundBlock);
    }

    override _references(): ReferenceTarget[] {
        return targets(this._placements(), this.replaceableBlocks);
    }
}
