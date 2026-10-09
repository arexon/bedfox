import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps } from "#/common/index";

@Ser()
export class CraftingTableBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:crafting_table";
    }

    @Ser()
    craftingTags?: string[];

    @Ser()
    tableName?: string;

    constructor(props: ComponentProps<CraftingTableBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
