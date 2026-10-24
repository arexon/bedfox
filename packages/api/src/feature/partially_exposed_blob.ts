import { Block } from "#/block/index";
import type { DefinitionProps, Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, type Direction, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class PartiallyExposedBlobFeature extends Feature.of(
    "minecraft:partially_exposed_blob_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    placesBlock!: BlockDescriptorRef;

    placementRadiusAroundFloor!: number;

    placementProbabilityPerValidPosition!: number;

    exposedFace?: Direction;

    constructor(identifier: string, props?: DefinitionProps<PartiallyExposedBlobFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Block, this.placesBlock);
    }
}
