import { type Reference, serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import type { DefinitionProps } from "#/definition/definition";
import { Feature } from "#/feature/base";
import type { FeatureReference } from "#/feature/base";
import { FormatVersion, type Molang } from "#/primitive/index";
import { targets } from "#/references";

const ROOT = "minecraft:scatter_feature";

@serialize
export class ScatterFeature extends Feature {
    static override readonly defaultFormatVersion = new FormatVersion(1, 26, 50);

    declare readonly [BRAND]: typeof ROOT;

    @serialize({ within: [ROOT, "description"] })
    override readonly identifier: string;

    @serialize({ within: ROOT })
    placesFeature!: FeatureReference;

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

    @serialize({ within: ROOT })
    projectInputToFloor?: boolean;

    constructor(identifier: string, props?: DefinitionProps<ScatterFeature>) {
        super(identifier);
        this.identifier = identifier;
        Object.assign(this, props);
    }

    override placements(): Reference[] {
        return targets(Feature, this.placesFeature);
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
