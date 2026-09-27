import {
    Definition,
    type DefinitionProps,
    type Reference,
    Relation,
} from "@bedfox/api/common";
import type { FeatureReference } from "@bedfox/api/feature";
import type { Molang } from "@bedfox/api/molang";
import { FormatVersion } from "@bedfox/api/version";
import { Ser } from "@bedfox/serialize";
import { autoIdentifier, refs } from "../_utils.ts";

const PATH = "minecraft:scatter_feature";

@Ser()
export class ScatterFeature extends Definition {
    override get fallbackFormatVersion(): FormatVersion {
        return new FormatVersion(1, 26, 50);
    }

    @Ser({ path: `${PATH}/description` })
    override identifier: string;

    @Ser({ path: `${PATH}/description`, custom: autoIdentifier })
    placesFeature!: FeatureReference;

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

    @Ser({ path: PATH })
    projectInputToFloor?: boolean;

    constructor(identifier: string, props?: DefinitionProps<ScatterFeature>) {
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

export const enum CoordinateEvalOrder {
    XYZ = "xyz",
    XZY = "xzy",
    YXZ = "yxz",
    YZX = "yzx",
    ZXY = "zxy",
    ZYX = "zyx",
}

export const enum RandomDistribution {
    Uniform = "uniform",
    Gaussian = "gaussian",
    InverseGaussian = "inverse_gaussian",
    Triangle = "triangle",
    FixedGrid = "fixed_grid",
    JitteredGrid = "jittered_grid",
}

@Ser()
export class ScatterDistribution {
    @Ser()
    distribution: RandomDistribution;

    @Ser()
    extent: [Molang, Molang];

    @Ser()
    gridOffset?: number;

    @Ser()
    stepSize?: number;

    constructor(
        distribution: RandomDistribution,
        extent: [Molang, Molang],
        gridOffset?: number,
        stepSize?: number,
    ) {
        this.distribution = distribution;
        this.extent = extent;
        this.gridOffset = gridOffset;
        this.stepSize = stepSize;
    }
}

@Ser()
export class ScatterChance {
    @Ser()
    numerator: number;

    @Ser()
    denominator: number;

    constructor(numerator: number, denominator: number) {
        this.numerator = numerator;
        this.denominator = denominator;
    }
}
