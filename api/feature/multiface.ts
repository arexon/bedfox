import {
    type BlockDescriptorRef,
    Definition,
    type DefinitionProps,
} from "@bedfox/api/common";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";

const PATH = "minecraft:multiface_feature";

@Ser()
export class MultifaceFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: PATH })
    placesBlock!: BlockDescriptorRef;

    @Ser({ path: PATH })
    searchRange!: number;

    @Ser({ path: PATH })
    canPlaceOnFloor!: boolean;

    @Ser({ path: PATH })
    canPlaceOnCeiling!: boolean;

    @Ser({ path: PATH })
    canPlaceOnWall!: boolean;

    @Ser({ path: PATH })
    chanceOfSpreading!: number;

    @Ser({ path: PATH })
    canPlaceOn?: BlockDescriptorRef[];

    constructor(identifier: string, props?: DefinitionProps<MultifaceFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _resolveInstances(): Definition[] {
        return [];
    }
}
