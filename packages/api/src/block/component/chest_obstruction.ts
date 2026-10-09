import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps } from "#/common/index";

export enum ObstructionRule {
    Always = "always",
    Never = "never",
    Shape = "shape",
}

@Ser()
export class ChestObstructionBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:chest_obstruction";
    }

    @Ser({ default: () => ObstructionRule.Shape })
    obstructionRule?: ObstructionRule;

    constructor(props: ComponentProps<ChestObstructionBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
