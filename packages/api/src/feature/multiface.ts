import { Ser } from "@bedfox/serialize";

import { targets } from "#/_utils";
import type { BlockDescriptorRef, DefinitionProps, ReferenceTarget } from "#/common/index";
import { Feature } from "#/feature/base";
import { FormatVersion } from "#/version";

const PATH = "minecraft:multiface_feature";

@Ser()
export class MultifaceFeature extends Feature {
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

    override _placements(): ReferenceTarget[] {
        return targets(this.placesBlock);
    }

    override _references(): ReferenceTarget[] {
        return targets(this._placements(), this.canPlaceOn);
    }
}
