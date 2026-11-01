import type { BRAND } from "#/brand";
import { KeyedCollection } from "#/component/collection";
import type { InstanceProps } from "#/definition/props";

export abstract class BlockTrait {
    /** This trait class's identifier, e.g. `minecraft:placement_direction`. */
    declare static readonly traitId: string;

    declare readonly [BRAND]: string;

    /** This trait's identifier. */
    get traitId(): string {
        return (this.constructor as typeof BlockTrait).traitId;
    }
}

export type BlockTraitProps<T> = InstanceProps<T>;

export class BlockTraitCollection extends KeyedCollection<BlockTrait> {
    constructor(...traits: BlockTrait[]) {
        super((trait) => trait.traitId, ...traits);
    }
}
