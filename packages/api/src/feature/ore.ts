import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import { type BlockDescriptorRef, FormatVersion } from "#/primitive/index";
import { serialize } from "#/serialize";

/** A block an ore places, and the blocks it may replace. */
export interface OreReplaceRule {
    placesBlock: BlockDescriptorRef;
    mayReplace?: BlockDescriptorRef[];
}

@serialize
export class OreFeature extends Feature.of("minecraft:ore_feature", new FormatVersion(1, 26, 50)) {
    override identifier: string;

    count!: number;

    discardChanceOnAirExposure?: number;

    replaceRules: OreReplaceRule[] = [];

    constructor(identifier: string, props?: DefinitionProps<OreFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    add(placesBlock: BlockDescriptorRef, mayReplace?: BlockDescriptorRef[]): this {
        this.replaceRules.push({ placesBlock, mayReplace });
        return this;
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.replaceRules.map((rule) => rule.placesBlock));
    }

    override _references(): ReferenceTarget[] {
        return targets(
            this._placements(),
            this.replaceRules.flatMap((rule) => rule.mayReplace ?? []),
        );
    }
}
