import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class MultifaceFeature extends Feature.of(
    "minecraft:multiface_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    placesBlock!: BlockDescriptorRef;

    searchRange!: number;

    canPlaceOnFloor!: boolean;

    canPlaceOnCeiling!: boolean;

    canPlaceOnWall!: boolean;

    chanceOfSpreading!: number;

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
