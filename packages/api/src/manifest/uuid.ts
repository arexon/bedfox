import { createHash } from "node:crypto";

/** The namespace UUID that {@link deriveUuid} hashes names under. It must never change. */
const BEDFOX_NAMESPACE = Uint8Array.fromHex(
    "d8ec201f-e462-4bf5-a971-ca7abad70464".replaceAll("-", ""),
);

/**
 * A version 5 UUID for `name`. The same name always gives the same UUID.
 *
 * @example
 *     deriveUuid("example/behavior/header");
 */
export function deriveUuid(name: string): string {
    const bytes = createHash("sha1").update(BEDFOX_NAMESPACE).update(name).digest().subarray(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toHex();
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
    ].join("-");
}
