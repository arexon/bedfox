import { type Reference, serialize } from "@bedfox/core";

import { Block } from "#/block/index";
import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { targets } from "#/references";

/** A block an ore places, and the blocks it may replace. */
export interface OreReplaceRule {
    placesBlock: BlockDescriptorRef;
    mayReplace?: BlockDescriptorRef[];
}

const ROOT = "minecraft:ore_feature";

@serialize
export class OreFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    count!: number;

    @serialize({ within: ROOT })
    discardChanceOnAirExposure?: number;

    @serialize({ within: ROOT })
    replaceRules: OreReplaceRule[] = [];

    constructor(identifier: string, props?: DefinitionProps<OreFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    add(placesBlock: BlockDescriptorRef, mayReplace?: BlockDescriptorRef[]): this {
        this.replaceRules.push({ placesBlock, mayReplace });
        return this;
    }

    override placements(): Reference[] {
        return targets(
            Block,
            this.replaceRules.map((rule) => rule.placesBlock),
        );
    }

    override references(): Reference[] {
        return [
            ...this.placements(),
            ...targets(
                Block,
                this.replaceRules.flatMap((rule) => rule.mayReplace ?? []),
            ),
        ];
    }
}
