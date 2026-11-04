import { type Reference, serialize } from "@bedfox/core";

import { Block } from "#/block/index";
import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { targets } from "#/references";

const ROOT = "minecraft:horizontal_tree_decoration_feature";

@serialize
export class HorizontalTreeDecorationFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    placesBlock!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    allowAdjacent?: boolean;

    @serialize({ within: ROOT })
    barkSideOnly?: boolean;

    constructor(identifier: string, props?: DefinitionProps<HorizontalTreeDecorationFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override placements(): Reference[] {
        return targets(Block, this.placesBlock);
    }
}
