import { type Reference, serialize } from "@bedfox/core";

import { Block } from "#/block/index";
import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { targets } from "#/references";

const ROOT = "minecraft:fossil_feature";

@serialize
export class FossilFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    oreBlock!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    maxEmptyCorners!: number;

    constructor(identifier: string, props?: DefinitionProps<FossilFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override placements(): Reference[] {
        return targets(Block, this.oreBlock);
    }
}
