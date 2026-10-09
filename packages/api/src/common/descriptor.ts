import { Ser } from "@bedfox/serialize";

@Ser()
export class BlockDescriptor {
    @Ser()
    name!: string;

    @Ser()
    tags?: string;

    @Ser({ default: () => ({}) })
    states?: Record<string, string | number | boolean>;

    constructor(props: BlockDescriptor) {
        Object.assign(this, props);
    }
}

export type BlockDescriptorRef = string | BlockDescriptor;
