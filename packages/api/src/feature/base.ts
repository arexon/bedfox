import type { BRAND } from "#/core/brand";
import { Definition, type DefinitionLocation, type Reference } from "#/core/definition";

export abstract class Feature extends Definition {
    static override readonly location: DefinitionLocation = {
        kind: "behavior",
        folder: "features",
    };

    declare readonly [BRAND]: `minecraft:${string}_feature` | "minecraft:conditional_list";

    /** Internal. Everything this feature places in the world. */
    _placements(): Reference[] {
        return [];
    }

    /** Internal. Placements plus anything else referenced, e.g. blocks a feature may replace. */
    override _references(): Reference[] {
        return this._placements();
    }
}

/** A feature, or the identifier of one. */
export type FeatureReference = string | Feature;
