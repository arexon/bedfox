import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class SupportBlockComponent extends Component.of("minecraft:support") {
    shape?: "fence" | "stair";

    constructor(props: ComponentProps<SupportBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
