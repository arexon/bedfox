import type { BRAND } from "#/core/brand";
import {
    Definition,
    type DefinitionLocation,
    type DefinitionProps,
    type Reference,
} from "#/core/definition";
import { targets } from "#/core/references";
import { Feature, type FeatureReference } from "#/feature/base";
import type { BiomeFilter } from "#/feature/biome_filter";
import type { CoordinateEvalOrder, ScatterChance, ScatterDistribution } from "#/feature/scatter";
import { FormatVersion, type Molang } from "#/primitive/index";
import { serialize } from "#/serialize";

export type PlacementPass =
    | "first_pass"
    | "before_underground_pass"
    | "underground_pass"
    | "after_underground_pass"
    | "before_surface_pass"
    | "surface_pass"
    | "after_surface_pass"
    | "before_sky_pass"
    | "sky_pass"
    | "after_sky_pass"
    | "final_pass";

const ROOT = "minecraft:feature_rules";

@serialize
export class FeatureRules extends Definition {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);
    static override readonly location: DefinitionLocation = {
        kind: "behavior",
        folder: "feature_rules",
    };

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: [ROOT, "description"] })
    placesFeature!: FeatureReference;

    @serialize({ within: [ROOT, "conditions"] })
    placementPass?: PlacementPass;

    @serialize({ within: [ROOT, "conditions"], rename: "minecraft:biome_filter" })
    biomeFilter?: BiomeFilter;

    @serialize({ within: [ROOT, "distribution"] })
    iterations?: Molang;

    @serialize({ within: [ROOT, "distribution"] })
    x?: Molang | ScatterDistribution;

    @serialize({ within: [ROOT, "distribution"] })
    y?: Molang | ScatterDistribution;

    @serialize({ within: [ROOT, "distribution"] })
    z?: Molang | ScatterDistribution;

    /** @default "xzy" */
    @serialize({ within: [ROOT, "distribution"] })
    coordinateEvalOrder?: CoordinateEvalOrder;

    @serialize({ within: [ROOT, "distribution"] })
    scatterChance?: ScatterChance;

    constructor(identifier: string, props?: DefinitionProps<FeatureRules>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    _placements(): Reference[] {
        return targets(Feature, this.placesFeature);
    }

    /** A rule references exactly what it places. */
    override _references(): Reference[] {
        return this._placements();
    }
}
