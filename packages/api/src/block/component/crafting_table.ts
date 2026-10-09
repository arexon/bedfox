import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class CraftingTableBlockComponent extends Component.of("minecraft:crafting_table") {
    craftingTags?: string[];

    tableName?: string;

    constructor(props: ComponentProps<CraftingTableBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
