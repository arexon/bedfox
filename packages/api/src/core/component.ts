import type { BRAND } from "#/core/brand";
import { KeyedCollection } from "#/core/collection";
import type { InstanceProps } from "#/core/props";

export type ComponentProps<T> = InstanceProps<T>;

/** A component in a definition such as a block or item. */
export abstract class Component {
    /** This component class's identifier, e.g. `minecraft:tick`. */
    declare static readonly componentId: string;

    declare readonly [BRAND]: string;

    /** This component's identifier. */
    get componentId(): string {
        return (this.constructor as typeof Component).componentId;
    }
}

export type ComponentCtor = abstract new (...args: never[]) => Component;

export class ComponentCollection extends KeyedCollection<Component> {
    constructor(...components: Component[]) {
        super((component) => component.componentId, ...components);
    }
}
