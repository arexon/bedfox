import { type InstanceProps, KeyedCollection } from "@bedfox/api/common";

export abstract class BlockTrait {
    abstract get traitId(): string;
}

export type BlockTraitProps<T> = InstanceProps<T, "traitId">;

export class BlockTraitCollection extends KeyedCollection<BlockTrait> {
    constructor(...traits: BlockTrait[]) {
        super((trait) => trait.traitId, ...traits);
    }
}
