import type { BRAND } from "#/core/brand";
import { Component } from "#/core/component";
import { serialize } from "#/serialize";

export type TintMethod =
    | "none"
    | "default_foliage"
    | "birch_foliage"
    | "evergreen_foliage"
    | "dry_foliage"
    | "grass"
    | "water";

export type RenderMethod =
    | "double_sided"
    | "blend"
    | "blend_to_opaque"
    | "opaque"
    | "alpha_test_to_opaque"
    | "alpha_test"
    | "alpha_test_single_sided"
    | "alpha_test_single_sided_to_opaque";

export interface MaterialInstance {
    texture?: string;

    /** @default 1 */
    ambientOcclusion?: number;

    /** @default "opaque" */
    renderMethod?: RenderMethod;

    /** @default "none" */
    tintMethod?: TintMethod;

    /** @default true */
    faceDimming?: boolean;

    /** @default false */
    isotropic?: boolean;

    /** @default false */
    alphaMaskedTint?: boolean;
}

@serialize
export class MaterialInstancesBlockComponent extends Component {
    static override readonly componentId = "minecraft:material_instances";

    declare readonly [BRAND]: typeof MaterialInstancesBlockComponent.componentId;

    @serialize({ keepKeys: true, transparent: true })
    value?: Record<string, MaterialInstance>;

    constructor(value: Record<string, MaterialInstance>) {
        super();
        this.value = value;
    }
}
