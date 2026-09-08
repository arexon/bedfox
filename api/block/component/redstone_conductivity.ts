import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser()
export class RedstoneConductivityBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:redstone_conductivity";
    }

    @Ser({ default: () => false })
    redstoneConductor?: boolean;

    @Ser({ default: () => true })
    allowsWireToStepDown?: boolean;

    constructor(props: ComponentProps<RedstoneConductivityBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
