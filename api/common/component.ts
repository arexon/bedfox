import { KeyedCollection } from "./keyed_collection.ts";
import type { InstanceProps } from "./props.ts";

export type ComponentProps<T> = InstanceProps<T, "componentId">;

/** A component in a definition such as a block or item. */
export abstract class Component {
    /** The identifier of this component. E.g. `minecraft:tick`. */
    abstract get componentId(): string;
}

export class ComponentCollection extends KeyedCollection<Component> {
    constructor(...components: Component[]) {
        super((component) => component.componentId, ...components);
    }
}
