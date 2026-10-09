import { Ser } from "@bedfox/serialize";

import { autoIdentifier, autoInstance, targets } from "#/_utils";
import {
    BlockDescriptor,
    type BlockDescriptorRef,
    type DefinitionProps,
    type ReferenceTarget,
} from "#/common/index";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/index";
import { FormatVersion } from "#/version";

export enum SnapSurface {
    Ceiling = "ceiling",
    Floor = "floor",
    RandomHorizontal = "random_horizontal",
    Wall = "wall",
}

const PATH = "minecraft:snap_to_surface_feature";

@Ser()
export class SnapToSurfaceFeature extends Feature {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH, custom: autoIdentifier })
    featureToSnap!: FeatureReference;

    @Ser({ path: PATH })
    searchRange!: number;

    @Ser({ path: PATH })
    surface?: SnapSurface;

    @Ser({ path: PATH, default: () => true })
    allowAirPlacement?: boolean;

    @Ser({ path: PATH, default: () => false })
    allowNonAirPlacement?: boolean;

    @Ser({ path: PATH, default: () => false })
    allowUnderwaterPlacement?: boolean;

    @Ser({
        path: PATH,
        custom: (v) =>
            v?.map((v) => (typeof v === "string" ? v : autoInstance(BlockDescriptor, v))),
    })
    allowedSurfaceBlocks?: BlockDescriptorRef[];

    @Ser({ path: PATH })
    embedInSurface?: boolean;

    constructor(identifier: string, props?: DefinitionProps<SnapToSurfaceFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.featureToSnap);
    }

    override _references(): ReferenceTarget[] {
        return targets(this._placements(), this.allowedSurfaceBlocks);
    }
}
