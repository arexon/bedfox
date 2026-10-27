import { Block } from "#/block/index";
import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, type Direction, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

const ROOT = "minecraft:partially_exposed_blob_feature";

@serialize
export class PartiallyExposedBlobFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    placesBlock!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    placementRadiusAroundFloor!: number;

    @serialize({ within: ROOT })
    placementProbabilityPerValidPosition!: number;

    @serialize({ within: ROOT })
    exposedFace?: Direction;

    constructor(identifier: string, props?: DefinitionProps<PartiallyExposedBlobFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Block, this.placesBlock);
    }
}
