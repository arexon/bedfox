import {
    Definition,
    type DefinitionCtor,
    type DefinitionProps,
    type ReferenceTarget,
} from "#/core/definition";
import { targets } from "#/core/references";
import type { FeatureReference } from "#/feature/base";
import type { BiomeFilter } from "#/feature/biome_filter";
import type { CoordinateEvalOrder, ScatterChance, ScatterDistribution } from "#/feature/scatter";
import { FormatVersion, type Molang } from "#/primitive/index";
import type { Filter } from "#/registry";
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

@serialize
export class FeatureRules extends Definition.of(
    "minecraft:feature_rules",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    @serialize({ within: "description" })
    placesFeature!: FeatureReference;

    @serialize({ within: "conditions" })
    placementPass?: PlacementPass;

    @serialize({ within: "conditions", rename: "minecraft:biome_filter" })
    biomeFilter?: BiomeFilter;

    @serialize({ within: "distribution" })
    iterations?: Molang;

    @serialize({ within: "distribution" })
    x?: Molang | ScatterDistribution;

    @serialize({ within: "distribution" })
    y?: Molang | ScatterDistribution;

    @serialize({ within: "distribution" })
    z?: Molang | ScatterDistribution;

    /** @default "xzy" */
    @serialize({ within: "distribution" })
    coordinateEvalOrder?: CoordinateEvalOrder;

    @serialize({ within: "distribution" })
    scatterChance?: ScatterChance;

    constructor(identifier: string, props?: DefinitionProps<FeatureRules>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    /** Matches feature rules that place `target`. */
    static placing(target: DefinitionCtor | ReferenceTarget): Filter<FeatureRules> {
        return (rule, reg) => rule._references().some((ref) => reg.matches(ref, target));
    }

    _placements(): ReferenceTarget[] {
        return [this.placesFeature];
    }

    /** A rule references exactly what it places. */
    override _references(): ReferenceTarget[] {
        return targets(this.placesFeature);
    }
}
