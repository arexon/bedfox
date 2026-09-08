import { Component, type ComponentProps, Vec3 } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser()
export class LeashableBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:leashable";
    }

    @Ser({ default: () => new Vec3(0, 0.25, 0), custom: Vec3.CUSTOM_SER.TUPLE })
    offset?: Vec3;

    constructor(props: ComponentProps<LeashableBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
