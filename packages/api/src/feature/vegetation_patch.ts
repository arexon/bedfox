import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion, Range } from "#/primitive/index";
import { serialize } from "#/serialize";

export type VegetationPatchSurface = "floor" | "ceiling";

@serialize
export class VegetationPatchFeature extends Feature.of(
    "minecraft:vegetation_patch_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    replaceableBlocks!: BlockDescriptorRef[];

    groundBlock!: BlockDescriptorRef;

    vegetationFeature!: FeatureReference;

    surface?: VegetationPatchSurface;

    depth!: number | Range;

    extraDeepBlockChance?: number;

    verticalRange!: number;

    vegetationChance?: number;

    horizontalRadius!: number | Range;

    extraEdgeColumnChance?: number;

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
