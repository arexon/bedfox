import { Block } from "#/block/index";
import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion, Range } from "#/primitive/index";
import { serialize } from "#/serialize";

export type VegetationPatchSurface = "floor" | "ceiling";

const ROOT = "minecraft:vegetation_patch_feature";

@serialize
export class VegetationPatchFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    replaceableBlocks!: BlockDescriptorRef[];

    @serialize({ within: ROOT })
    groundBlock!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    vegetationFeature!: FeatureReference;

    @serialize({ within: ROOT })
    surface?: VegetationPatchSurface;

    @serialize({ within: ROOT })
    depth!: number | Range;

    @serialize({ within: ROOT })
    extraDeepBlockChance?: number;

    @serialize({ within: ROOT })
    verticalRange!: number;

    @serialize({ within: ROOT })
    vegetationChance?: number;

    @serialize({ within: ROOT })
    horizontalRadius!: number | Range;

    @serialize({ within: ROOT })
    extraEdgeColumnChance?: number;

    @serialize({ within: ROOT })
    waterlogged?: boolean;

    constructor(identifier: string, props?: DefinitionProps<VegetationPatchFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return [...targets(Feature, this.vegetationFeature), ...targets(Block, this.groundBlock)];
    }

    override _references(): Reference[] {
        return [...this._placements(), ...targets(Block, this.replaceableBlocks)];
    }
}
