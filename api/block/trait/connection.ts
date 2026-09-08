import { Ser } from "@bedfox/serialize";
import { BlockTrait, type BlockTraitProps } from "./base.ts";

export const enum ConnectionEnabledState {
    CardinalConnections = "minecraft:cardinal_connections",
}

@Ser()
export class ConnectionBlockTrait extends BlockTrait {
    override get traitId(): string {
        return "minecraft:connection";
    }

    @Ser()
    enabledStates!: ConnectionEnabledState[];

    constructor(props: BlockTraitProps<ConnectionBlockTrait>) {
        super();
        Object.assign(this, props);
    }
}
