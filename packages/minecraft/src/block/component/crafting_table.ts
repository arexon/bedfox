import { serialize } from "@bedfox/core";

import type { BRAND } from "#/brand";
import { Component, type ComponentProps } from "#/component/component";

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
