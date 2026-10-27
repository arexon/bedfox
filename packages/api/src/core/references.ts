import {
    Definition,
    type DefinitionCtor,
    type Reference,
    type ReferenceTarget,
} from "#/core/definition";

/** The identifier a reference target refers to. */
export function autoIdentifier(target: ReferenceTarget): string {
    if (typeof target === "string") return target;
    return target instanceof Definition ? target.identifier : target.name;
}

/** References to definitions of class `ctor`, skipping unset values. */
export function targets(
    ctor: DefinitionCtor,
    ...values: (ReferenceTarget | ReferenceTarget[] | undefined)[]
): Reference[] {
    return values
        .flat()
        .filter((value) => value !== undefined)
        .map((target) => ({ ctor, target }));
}
