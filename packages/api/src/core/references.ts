import { Definition, type ReferenceTarget } from "#/core/definition";

/** The identifier a reference target refers to. */
export function autoIdentifier(target: ReferenceTarget): string {
    if (typeof target === "string") return target;
    return target instanceof Definition ? target.identifier : target.name;
}

export function targets(
    ...values: (ReferenceTarget | ReferenceTarget[] | undefined)[]
): ReferenceTarget[] {
    return values.flat().filter((value) => value !== undefined);
}
