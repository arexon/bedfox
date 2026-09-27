import {
    BlockDescriptor,
    type Reference,
    type ReferenceTarget,
    type Relation,
} from "@bedfox/api/common";

export function autoInstance<Props extends Val | undefined, Val>(
    ctor: new (props: Props) => Props,
    value?: Val,
    predicate?: (value: Val) => boolean,
): Val | undefined {
    if (value === undefined) {
        return value;
    } else if (predicate?.(value) && !(value instanceof ctor)) {
        return new ctor(value as never);
    }
    return value;
}

export function multiAutoInstance<Props extends Val, Val>(
    ctor: new (props: Props) => Props,
    values: Val[],
    predicate?: (value: Val) => boolean,
): Val[] {
    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (predicate?.(value) && !(value instanceof ctor)) {
            values[i] = new ctor(value as never);
        }
    }
    return values;
}

export function autoIdentifier(target: ReferenceTarget): string {
    if (typeof target === "string") return target;
    if (target instanceof BlockDescriptor) return target.name;
    return target.identifier;
}

/** Builds references of one relation from targets, flattening arrays and skipping `undefined`. */
export function refs(
    relation: Relation,
    ...targets: (ReferenceTarget | ReferenceTarget[] | undefined)[]
): Reference[] {
    return targets.flat().flatMap((target) =>
        target === undefined ? [] : [{ relation, target }]
    );
}
