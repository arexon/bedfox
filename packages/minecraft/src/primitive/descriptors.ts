/** A block by its identifier, with optional states and a tag query. */
export interface BlockDescriptor {
    /** The block's identifier, e.g. `minecraft:stone`. */
    name: string;

    /** A Molang query on the block's tags, e.g. `q.any_tag('stone')`. */
    tags?: string;

    /** The values of the block's states, e.g. `{ "minecraft:cardinal_direction": "north" }`. */
    states?: Record<string, string | number | boolean>;
}

/** A block identifier or a {@link BlockDescriptor}. */
export type BlockDescriptorRef = string | BlockDescriptor;
