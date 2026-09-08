import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser()
export class RedstoneConsumerBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:redstone_consumer";
    }

    @Ser({ default: () => 0 })
    minPower?: number;

    @Ser({ default: () => false })
    propagatesPower?: boolean;

    constructor(props: ComponentProps<RedstoneConsumerBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
