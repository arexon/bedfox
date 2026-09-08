import { Component, type ComponentProps, Vec3 } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser()
export class TransformationBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:transformation";
    }

    @Ser({ default: () => new Vec3(0, 0, 0), custom: Vec3.CUSTOM_SER.TUPLE })
    translation?: Vec3;

    @Ser({ default: () => new Vec3(1, 1, 1), custom: Vec3.CUSTOM_SER.TUPLE })
    scale?: Vec3;

    @Ser({ default: () => new Vec3(0, 0, 0), custom: Vec3.CUSTOM_SER.TUPLE })
    scalePivot?: Vec3;

    @Ser({ default: () => new Vec3(0, 0, 0), custom: Vec3.CUSTOM_SER.TUPLE })
    rotation?: Vec3;

    @Ser({ default: () => new Vec3(0, 0, 0), custom: Vec3.CUSTOM_SER.TUPLE })
    rotationPivot?: Vec3;

    constructor(props: ComponentProps<TransformationBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
