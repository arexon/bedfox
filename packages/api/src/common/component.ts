import { KeyedCollection } from "#/common/keyed_collection";
import type { InstanceProps } from "#/common/props";

export type ComponentProps<T> = InstanceProps<T, "componentId">;

/** A component in a definition such as a block or item. */
export abstract class Component {
    /** The identifier of this component. E.g. `minecraft:tick`. */
    abstract get componentId(): string;
}

export type ComponentCtor = abstract new (...args: never[]) => Component;

export class ComponentCollection extends KeyedCollection<Component> {
    constructor(...components: Component[]) {
        super((component) => component.componentId, ...components);
    }
}
