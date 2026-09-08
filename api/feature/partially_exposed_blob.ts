import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
    type Direction,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";

const PATH = "minecraft:partially_exposed_blob_feature";

@Ser()
export class PartiallyExposedBlobFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    placesBlock!: BlockDescriptorRef;

    @Ser({ path: PATH })
    placementRadiusAroundFloor!: number;

    @Ser({ path: PATH })
    placementProbabilityPerValidPosition!: number;

    @Ser({ path: PATH })
    exposedFace?: Direction;

    constructor(
        identifier: string,
        props?: DefinitionProps<PartiallyExposedBlobFeature>,
    ) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _resolveInstances(): Definition[] {
        return [];
    }
}
