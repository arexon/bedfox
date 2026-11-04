import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";

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
