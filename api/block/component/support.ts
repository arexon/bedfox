import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser()
export class SupportBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:support";
    }

    @Ser()
    shape?: "fence" | "stair";

    constructor(props: ComponentProps<SupportBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
