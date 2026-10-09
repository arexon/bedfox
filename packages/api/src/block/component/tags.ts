import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps } from "#/common/index";

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
