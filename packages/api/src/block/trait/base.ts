import { KeyedCollection } from "#/core/collection";
import type { Ctor, InstanceProps } from "#/core/props";

/** A block trait, which generates block states and permutations. */
export abstract class BlockTrait {
    /** This trait class's identifier, e.g. `minecraft:placement_direction`. */
    declare static readonly traitId: string;

    /** A base for a trait class identified by `traitId`, e.g. `minecraft:placement_direction`. */
    static of<C extends Ctor<BlockTrait>>(this: C, traitId: string): C {
        abstract class Base extends this {}
        Object.defineProperty(Base, "traitId", { value: traitId });
        return Base;
    }

    /** The identifier of this trait. E.g. `minecraft:placement_direction`. */
    get traitId(): string {
        return (this.constructor as typeof BlockTrait).traitId;
    }
}

export type BlockTraitProps<T> = InstanceProps<T, "traitId">;

export class BlockTraitCollection extends KeyedCollection<BlockTrait> {
    constructor(...traits: BlockTrait[]) {
        super((trait) => trait.traitId, ...traits);
    }
}
