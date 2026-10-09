import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class TagsBlockComponent extends Component.of("minecraft:tags") {
    @serialize({ transparent: true })
    value?: string[];

    constructor(props: ComponentProps<TagsBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
