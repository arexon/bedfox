import type { DefinitionProps, ReferenceTarget } from "#/core/definition";
import { targets } from "#/core/references";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion, type Molang } from "#/primitive/index";
import { serialize } from "#/serialize";

@serialize
export class ScatterFeature extends Feature.of(
    "minecraft:scatter_feature",
    new FormatVersion(1, 26, 50),
) {
    override identifier: string;

    placesFeature!: FeatureReference;

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

    projectInputToFloor?: boolean;

    constructor(identifier: string, props?: DefinitionProps<ScatterFeature>) {
        super();
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override _placements(): ReferenceTarget[] {
        return targets(this.placesFeature);
    }
}

export type CoordinateEvalOrder = "xyz" | "xzy" | "yxz" | "yzx" | "zxy" | "zyx";

export type RandomDistribution =
    | "uniform"
    | "gaussian"
    | "inverse_gaussian"
    | "triangle"
    | "fixed_grid"
    | "jittered_grid";

export interface ScatterDistribution {
    distribution: RandomDistribution;
    extent: [Molang, Molang];
    gridOffset?: number;
    stepSize?: number;
}

export interface ScatterChance {
    numerator: number;
    denominator: number;
}
