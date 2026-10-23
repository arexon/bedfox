import { Component, type ComponentProps } from "#/core/component";
import type { Range } from "#/primitive/index";
import { serialize } from "#/serialize";

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
