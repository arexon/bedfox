import { Component, type ComponentProps } from "#/core/component";
import { serialize } from "#/core/serialize";

@serialize
export class EntityFallOnBlockComponent extends Component.of("minecraft:entity_fall_on") {
    /** @default 0 */
    minFallDistance?: number;

    constructor(props: ComponentProps<EntityFallOnBlockComponent>) {
        super();
        Object.assign(this, props);
    }
}
