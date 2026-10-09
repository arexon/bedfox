import { Ser } from "@bedfox/serialize";

import { Component, type ComponentProps } from "#/common/index";

@Ser()
export class EntityFallOnBlockComponent extends Component {
    override get componentId(): string {
        return "minecraft:entity_fall_on";
    }

    @Ser({ default: () => 0 })
    minFallDistance?: number;

    constructor(props: ComponentProps<EntityFallOnBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
