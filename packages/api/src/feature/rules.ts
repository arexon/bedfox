import { Ser } from "@bedfox/serialize";

import { autoIdentifier, autoInstance, targets } from "#/_utils";
import {
    Definition,
    type DefinitionCtor,
    type DefinitionProps,
    type ReferenceTarget,
} from "#/common/index";
import {
    BiomeFilter,
    CoordinateEvalOrder,
    type FeatureReference,
    type ScatterChance,
    type ScatterDistribution,
} from "#/feature/index";
import type { Molang } from "#/molang";
import type { Filter } from "#/registry";
import { FormatVersion } from "#/version";

export const enum PlacementPass {
    FirstPass = "first_pass",
    BeforeUndergroundPass = "before_underground_pass",
    UndergroundPass = "underground_pass",
    AfterUndergroundPass = "after_underground_pass",
    BeforeSurfacePass = "before_surface_pass",
    SurfacePass = "surface_pass",
    AfterSurfacePass = "after_surface_pass",
    BeforeSkyPass = "before_sky_pass",
    SkyPass = "sky_pass",
    AfterSkyPass = "after_sky_pass",
    FinalPass = "final_pass",
}

const PATH = "minecraft:feature_rules";

@Ser()
export class FeatureRules extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: `${PATH}/description`, custom: autoIdentifier })
    placesFeature!: FeatureReference;

    @Ser({ path: `${PATH}/conditions` })
    placementPass?: PlacementPass;

    @Ser({
        path: `${PATH}/conditions`,
        rename: "minecraft:biome_filter",
        custom: (v) => autoInstance(BiomeFilter, v),
    })
    biomeFilter?: BiomeFilter;

    @Ser({ path: `${PATH}/distribution` })
    iterations?: Molang;

    @Ser({ path: `${PATH}/distribution` })
    x?: Molang | ScatterDistribution;

    @Ser({ path: `${PATH}/distribution` })
    y?: Molang | ScatterDistribution;

    @Ser({ path: `${PATH}/distribution` })
    z?: Molang | ScatterDistribution;

    @Ser({
        path: `${PATH}/distribution`,
        default: () => CoordinateEvalOrder.XZY,
    })
    coordinateEvalOrder?: CoordinateEvalOrder;

    @Ser({ path: `${PATH}/distribution` })
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
