import { Component, type ComponentProps, Range } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

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
