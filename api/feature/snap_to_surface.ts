import {
    BlockDescriptor,
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
} from "@bedfox/api/common";
import type { FeatureReference } from "@bedfox/api/feature";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier, autoInstance } from "../_utils.ts";

export enum SnapSurface {
    Ceiling = "ceiling",
    Floor = "floor",
    RandomHorizontal = "random_horizontal",
    Wall = "wall",
}

const PATH = "minecraft:snap_to_surface_feature";

@Ser()
export class SnapToSurfaceFeature extends Definition {
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
            v?.map((v) =>
                typeof v === "string" ? v : autoInstance(BlockDescriptor, v)
            ),
    })
    allowedSurfaceBlocks?: BlockDescriptorRef[];

    @Ser({ path: PATH })
    embedInSurface?: boolean;

    constructor(
        identifier: string,
        props?: DefinitionProps<SnapToSurfaceFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _resolveInstances(): Definition[] {
        return typeof this.featureToSnap === "string"
            ? []
            : [this.featureToSnap];
    }
}
