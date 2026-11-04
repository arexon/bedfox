import { Entry, type EntryCtor, type Reference } from "@bedfox/core";

import type { BlockDescriptor } from "#/primitive/index";

export function targets(
    ctor: EntryCtor,
    ...values: (
        | Entry
        | BlockDescriptor
        | string
        | (Entry | BlockDescriptor | string)[]
        | undefined
    )[]
): Reference[] {
    return values
        .flat()
        .filter((value) => value !== undefined)
        .map((value) => ({
            ctor,
            target: typeof value === "string" || value instanceof Entry ? value : value.name,
        }));
}
