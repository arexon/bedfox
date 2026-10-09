import { BlockTrait, type BlockTraitProps } from "#/block/trait/base";
import { serialize } from "#/core/serialize";

export type ConnectionEnabledState = "minecraft:cardinal_connections";

@serialize
export class ConnectionBlockTrait extends BlockTrait.of("minecraft:connection") {
    enabledStates!: ConnectionEnabledState[];

    constructor(props: BlockTraitProps<ConnectionBlockTrait>) {
        super();
        Object.assign(this, props);
    }
}
