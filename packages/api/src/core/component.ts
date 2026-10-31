import type { BRAND } from "#/core/brand";
import { KeyedCollection } from "#/core/collection";
import type { InstanceProps } from "#/core/props";

/** The fields that a component's constructor accepts. See {@link InstanceProps}. */
export type ComponentProps<T> = InstanceProps<T>;

/**
 * A component of a definition, such as a block or an item.
 *
 * Each component class has its own identifier. A definition holds its components in a
 * {@link ComponentCollection}.
 */
export abstract class Component {
    /** The identifier of this component class, e.g. `minecraft:tick`. */
    declare static readonly componentId: string;

    declare readonly [BRAND]: string;

    /** The identifier of this component's class. */
    get componentId(): string {
        return (this.constructor as typeof Component).componentId;
    }
}

/** Any concrete or abstract component class. */
export type ComponentCtor = abstract new (...args: never[]) => Component;

/**
 * The components of a definition, with one component for each identifier.
 *
 * A component replaces the component that has the same identifier.
 */
export class ComponentCollection extends KeyedCollection<Component> {
    /** Creates a collection that holds `components`. */
    constructor(...components: Component[]) {
        super((component) => component.componentId, ...components);
    }
}
