import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class SupportBlockComponent extends Component {
    static override readonly componentId = "minecraft:support";

    declare readonly [BRAND]: typeof SupportBlockComponent.componentId;

    shape?: "fence" | "stair";

    constructor(props: ComponentProps<SupportBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
