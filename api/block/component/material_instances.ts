import { Component, type ComponentProps, TintMethod } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

export enum RenderMethod {
    DoubleSided = "double_sided",
    Blend = "blend",
    BlendToOpaque = "blend_to_opaque",
    Opaque = "opaque",
    AlphaTestToOpaque = "alpha_test_to_opaque",
    AlphaTest = "alpha_test",
    AlphaTestSingleSided = "alpha_test_single_sided",
    AlphaTestSingleSidedToOpaque = "alpha_test_single_sided_to_opaque",
}

@Ser()
export class MaterialInstance {
    @Ser()
    texture?: string;

    @Ser({ default: () => 1 })
    ambientOcclusion?: number;

    @Ser({ default: () => RenderMethod.Opaque })
    renderMethod?: RenderMethod;

    @Ser({ default: () => TintMethod.None })
    tintMethod?: TintMethod;

    @Ser({ default: () => true })
    faceDimming?: boolean;

    @Ser({ default: () => false })
    isotropic?: boolean;

    @Ser({ default: () => false })
    alphaMaskedTint?: boolean;

    constructor(input: ComponentProps<MaterialInstance>) {
        Object.assign(this, input);
    }
}

@Ser({ transparent: "value" })
export class MaterialInstancesBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:material_instances";
    }

    @Ser({
        custom(instances) {
            if (instances === undefined) return;
            for (const [bone, instance] of Object.entries(instances)) {
                if (!(instance instanceof MaterialInstance)) {
                    instances[bone] = new MaterialInstance(instance);
                }
            }
            return instances;
        },
    })
    value?: Record<string, MaterialInstance>;

    constructor(value: Record<string, MaterialInstance>) {
        super();
        this.value = value;
    }
}
