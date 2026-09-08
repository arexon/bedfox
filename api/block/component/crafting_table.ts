import { Component, type ComponentProps } from "@bedfox/api/common";
import { Ser } from "@bedfox/serialize";

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
