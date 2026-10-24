/** A block, optionally narrowed by states or a tag query. */
export interface BlockDescriptor {
    name: string;

    tags?: string;

    states?: Record<string, string | number | boolean>;
}

/** A block identifier, or a {@link BlockDescriptor}. */
export type BlockDescriptorRef = string | BlockDescriptor;
