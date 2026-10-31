import type { BRAND } from "#/core/brand";
import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/serialize";

@serialize
export class CraftingTableBlockComponent extends Component {
    static override readonly componentId = "minecraft:crafting_table";

    declare readonly [BRAND]: typeof CraftingTableBlockComponent.componentId;

    craftingTags?: string[];

    tableName?: string;

    constructor(props: ComponentProps<CraftingTableBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
