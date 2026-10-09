import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps, Range } from "#/common/index";

@Ser()
export class TickBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:tick";
    }

    @Ser({ custom: Range.CUSTOM_SER.TUPLE })
    intervalRange?: Range;

    @Ser({ default: () => true })
    looping?: boolean;

    constructor(props: ComponentProps<TickBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
