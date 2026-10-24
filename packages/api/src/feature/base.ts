import { Definition, type Reference } from "#/core/definition";

export abstract class Feature extends Definition {
    /**
     * Internal. The root key of every feature, e.g. `minecraft:ore_feature`. Feature rules have a
     * different root, which keeps them from being structurally equivalent to features.
     */
    declare readonly _root: `minecraft:${string}_feature` | "minecraft:conditional_list";

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
