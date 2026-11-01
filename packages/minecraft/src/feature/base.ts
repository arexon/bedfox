import type { Reference } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Definition, type DefinitionLocation } from "#/definition/definition";

export abstract class Feature extends Definition {
    static override readonly location: DefinitionLocation = {
        kind: "behavior",
        folder: "features",
    };

    declare readonly [BRAND]: `minecraft:${string}_feature` | "minecraft:conditional_list";

    /** Returns the blocks and features that this feature places. */
    placements(): Reference[] {
        return [];
    }

    override references(): Reference[] {
        return this.placements();
    }
}

/** A feature, or the identifier of one. */
export type FeatureReference = string | Feature;
