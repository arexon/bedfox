import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

@Ser({ transparent: "value" })
export class TagsBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:tags";
    }

    @Ser()
    value?: string[];

    constructor(props: ComponentProps<TagsBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
