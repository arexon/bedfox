import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";
import type { Range } from "#/primitive/index";

@serialize
export class TickBlockComponent extends Component {
    static override readonly componentId = "minecraft:tick";

    declare readonly [BRAND]: typeof TickBlockComponent.componentId;

    intervalRange?: Range;

    /** @default true */
    looping?: boolean;

    constructor(props: ComponentProps<TickBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
