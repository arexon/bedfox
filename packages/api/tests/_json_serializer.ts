import type { SnapshotSerializer } from "vite-plus/test";

/** Stores snapshots as the JSON that bedfox writes, so they also check key order. */
export default {
    test: () => true,
    serialize: (value) => JSON.stringify(value, null, 2),
} satisfies SnapshotSerializer;
