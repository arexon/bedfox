import { Block } from "#/block/index";
import type { DefinitionProps, Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

export type SnapSurface = "ceiling" | "floor" | "random_horizontal" | "wall";

@serialize
export class SnapToSurfaceFeature extends Feature.of(
    "minecraft:snap_to_surface_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    featureToSnap!: FeatureReference;

    searchRange!: number;

    surface?: SnapSurface;

    /** @default true */
    allowAirPlacement?: boolean;

    /** @default false */
    allowNonAirPlacement?: boolean;

    /** @default false */
    allowUnderwaterPlacement?: boolean;

    allowedSurfaceBlocks?: BlockDescriptorRef[];

    embedInSurface?: boolean;

    constructor(identifier: string, props?: DefinitionProps<SnapToSurfaceFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): Reference[] {
        return targets(Feature, this.featureToSnap);
    }

    override _references(): Reference[] {
        return [...this._placements(), ...targets(Block, this.allowedSurfaceBlocks)];
    }
}
