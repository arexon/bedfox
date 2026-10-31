import {
    Definition,
    type DefinitionCtor,
    type Reference,
    type ReferenceTarget,
} from "#/core/definition";

export function autoIdentifier(target: ReferenceTarget): string {
    if (typeof target === "string") return target;
    return target instanceof Definition ? target.identifier : target.name;
}

export function targets(
    ctor: DefinitionCtor,
    ...values: (ReferenceTarget | ReferenceTarget[] | undefined)[]
): Reference[] {
    return values
        .flat()
        .filter((value) => value !== undefined)
        .map((target) => ({ ctor, target }));
}
