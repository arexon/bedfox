import {
    Definition,
    type DefinitionProps,
    type Reference,
    Relation,
} from "@bedfox/api/common";
import {
    BiomeFilter,
    CoordinateEvalOrder,
    type FeatureReference,
    type ScatterChance,
    type ScatterDistribution,
} from "@bedfox/api/feature";
import type { Molang } from "@bedfox/api/molang";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier, autoInstance, refs } from "../_utils.ts";

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

    override _references(): Reference[] {
        return [
            ...refs(Relation.Places, this.placesFeature),
        ];
    }
}
