import { BlockTrait, type BlockTraitProps } from "#/block/trait/base";
import type { BRAND } from "#/core/brand";
import { serialize } from "#/serialize";

export type ConnectionEnabledState = "minecraft:cardinal_connections";

@serialize
export class ConnectionBlockTrait extends BlockTrait {
    static override readonly traitId = "minecraft:connection";

    declare readonly [BRAND]: typeof ConnectionBlockTrait.traitId;

    enabledStates!: ConnectionEnabledState[];

    constructor(props: BlockTraitProps<ConnectionBlockTrait>) {
        super();
        Object.assign(this, props);
    }
}
