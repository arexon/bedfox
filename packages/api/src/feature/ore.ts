import { Block } from "#/block/index";
import type { BRAND } from "#/core/brand";
import { type DefinitionProps, type Reference } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

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

    override _placements(): Reference[] {
        return targets(
            Block,
            this.replaceRules.map((rule) => rule.placesBlock),
        );
    }

    override _references(): Reference[] {
        return [
            ...this._placements(),
            ...targets(
                Block,
                this.replaceRules.flatMap((rule) => rule.mayReplace ?? []),
            ),
        ];
    }
}
