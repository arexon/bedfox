import { type Reference, serialize } from "@bedfox/core";

import { Block } from "#/block/index";
import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { targets } from "#/references";

const ROOT = "minecraft:multiface_feature";

@serialize
export class MultifaceFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    placesBlock!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    searchRange!: number;

    @serialize({ within: ROOT })
    canPlaceOnFloor!: boolean;

    @serialize({ within: ROOT })
    canPlaceOnCeiling!: boolean;

    @serialize({ within: ROOT })
    canPlaceOnWall!: boolean;

    @serialize({ within: ROOT })
    chanceOfSpreading!: number;

    @serialize({ within: ROOT })
    canPlaceOn?: BlockDescriptorRef[];

    constructor(identifier: string, props?: DefinitionProps<MultifaceFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override placements(): Reference[] {
        return targets(Block, this.placesBlock);
    }

    override references(): Reference[] {
        return [...this.placements(), ...targets(Block, this.canPlaceOn)];
    }
}
