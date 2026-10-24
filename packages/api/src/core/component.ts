import { KeyedCollection } from "#/core/collection";
import type { Ctor, InstanceProps } from "#/core/props";

export type ComponentProps<T> = InstanceProps<T, "componentId">;

/** A component in a definition such as a block or item. */
export abstract class Component {
    /** This component class's identifier, e.g. `minecraft:tick`. */
    declare static readonly componentId: string;

    /** A base for a component class identified by `componentId`, e.g. `minecraft:tick`. */
    static of<C extends Ctor<Component>>(this: C, componentId: string): C {
        abstract class Base extends this {}
        Object.defineProperty(Base, "componentId", { value: componentId });
        return Base;
    }

    /** The identifier of this component. E.g. `minecraft:tick`. */
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
