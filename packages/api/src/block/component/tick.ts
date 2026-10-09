import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";
import type { Range } from "#/primitive/index";

@serialize
export class TickBlockComponent extends Component.of("minecraft:tick") {
    intervalRange?: Range;

    /** @default true */
    looping?: boolean;

    constructor(props: ComponentProps<TickBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
