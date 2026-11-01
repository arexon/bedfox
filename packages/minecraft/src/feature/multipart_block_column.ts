import { type Reference, serialize } from "@bedfox/core";

import { Block } from "#/block/index";
import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import {
    type BlockDescriptorRef,
    FormatVersion,
    Range,
    type VerticalDirection,
} from "#/primitive/index";
import { targets } from "#/references";

const ROOT = "minecraft:multipart_block_column_feature";

@serialize
export class MultipartBlockColumnFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    tipBlock!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    frustumBlock!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    middleBlock!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    baseBlock!: BlockDescriptorRef;

    @serialize({ within: ROOT })
    heightRange?: number | Range;

    @serialize({ within: ROOT })
    weightedHeights?: number[];

    @serialize({ within: ROOT })
    direction?: VerticalDirection;

    @serialize({ within: ROOT })
    mayPlaceOn?: BlockDescriptorRef[];

    @serialize({ within: ROOT })
    mayReplace?: BlockDescriptorRef[];

    constructor(identifier: string, props?: DefinitionProps<MultipartBlockColumnFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override placements(): Reference[] {
        return targets(Block, this.tipBlock, this.frustumBlock, this.middleBlock, this.baseBlock);
    }

    override references(): Reference[] {
        return [...this.placements(), ...targets(Block, this.mayPlaceOn, this.mayReplace)];
    }
}
