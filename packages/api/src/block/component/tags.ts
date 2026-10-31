import type { BRAND } from "#/core/brand";
import { Component } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class TagsBlockComponent extends Component {
    static override readonly componentId = "minecraft:tags";

    declare readonly [BRAND]: typeof TagsBlockComponent.componentId;

    @serialize({ transparent: true })
    value?: string[];

    constructor(...value: string[]) {
        super();
        this.value = value;
    }
}
