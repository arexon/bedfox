import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import type { Range } from "#/primitive/index";
import { serialize } from "#/serialize";

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
