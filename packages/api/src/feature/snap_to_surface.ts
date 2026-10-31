import { Block } from "#/block/index";
import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

export type SnapSurface = "ceiling" | "floor" | "random_horizontal" | "wall";

const ROOT = "minecraft:snap_to_surface_feature";

@serialize
export class SnapToSurfaceFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    featureToSnap!: FeatureReference;

    @serialize({ within: ROOT })
    searchRange!: number;

    @serialize({ within: ROOT })
    surface?: SnapSurface;

    /** @default true */
    @serialize({ within: ROOT })
    allowAirPlacement?: boolean;

    /** @default false */
    @serialize({ within: ROOT })
    allowNonAirPlacement?: boolean;

    /** @default false */
    @serialize({ within: ROOT })
    allowUnderwaterPlacement?: boolean;

    @serialize({ within: ROOT })
    allowedSurfaceBlocks?: BlockDescriptorRef[];

    @serialize({ within: ROOT })
    embedInSurface?: boolean;

    constructor(identifier: string, props?: DefinitionProps<SnapToSurfaceFeature>) {
        super(identifier);
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
