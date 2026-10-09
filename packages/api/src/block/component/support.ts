import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps } from "#/common/index";

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
