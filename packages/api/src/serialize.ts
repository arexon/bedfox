const OPTIONS = new WeakMap<object, Map<string, FieldOptions>>();

const SCHEMAS = new WeakMap<object, Schema>();

/** The method key for values that serialize as a reference when they are inside another value. */
export const TO_REFERENCE: unique symbol = Symbol("to_reference");

/** A field decorator that only accepts classes whose instances are `This`. */
export type FieldDecorator<This extends object = object> = (prototype: This, name: string) => void;

/** How a field of type `T`, on instances of `This`, serializes. Every option is off by default. */
export interface FieldOptions<T = unknown, This extends object = object> {
    /** The JSON key to use in place of the snake_case field name. */
    rename?: string;
    /**
     * The nested objects that hold the field, e.g. `["description", "menu_category"]`.
     *
     * A nested object with no set fields is omitted. Not allowed together with
     * {@link FieldOptions.transparent}.
     */
    within?: string | readonly string[];
    /**
     * Keeps the keys of the field's record as written, e.g. for names that users choose.
     *
     * Only the keys at the top level of the record stay the same. Keys of records at deeper levels
     * change to snake_case.
     */
    keepKeys?: boolean;
    /**
     * Makes the field's value replace the whole object when no other field is set.
     *
     * Only one field of a class can be transparent. Not allowed together with
     * {@link FieldOptions.within}.
     */
    transparent?: boolean;
    /**
     * Maps the field's value before it serializes.
     *
     * The function also runs when the field is not set. It gets the instance that holds the field
     * as its second argument. Its result serializes like a normal value, so its keys change to
     * snake_case.
     *
     * If the function returns `undefined`, the field is omitted. An empty array or object that it
     * returns stays in the JSON.
     */
    override?: (value: T | undefined, instance: This) => unknown;
}

/** Thrown by {@link serialize} when it decorates a static field, a method or an accessor. */
export class DecoratedNonFieldError extends TypeError {
    constructor(name: string) {
        super(`@serialize() only works on instance fields, not '${name}'`);
        this.name = "DecoratedNonFieldError";
    }
}

/**
 * Thrown when an instance serializes and its class has more than one
 * {@link FieldOptions.transparent} field.
 */
export class MultipleTransparentFieldsError extends TypeError {
    constructor(className: string, first: string, second: string) {
        super(`'${className}' has two transparent fields, '${first}' and '${second}'`);
        this.name = "MultipleTransparentFieldsError";
    }
}

/**
 * Thrown when an instance serializes and a {@link FieldOptions.transparent} field of its class is
 * {@link FieldOptions.within} a nested object.
 */
export class NestedTransparentFieldError extends TypeError {
    constructor(className: string, field: string) {
        super(`'${className}.${field}' can't be both transparent and within a nested object`);
        this.name = "NestedTransparentFieldError";
    }
}

/** Thrown when an instance serializes and two fields of its class use the same JSON key. */
export class DuplicateJsonKeyError extends TypeError {
    constructor(className: string, key: string) {
        super(`'${className}' serializes more than one field under '${key}'`);
        this.name = "DuplicateJsonKeyError";
    }
}

/** Thrown when an instance serializes and a value has no JSON form, e.g. a `Map` or a `Set`. */
export class UnsupportedJsonValueError extends TypeError {
    constructor(type: string) {
        super(`${type} can't be serialized to JSON`);
        this.name = "UnsupportedJsonValueError";
    }
}

/**
 * Adds a `toJSON()` method that serializes the instances of a class.
 *
 * The method serializes each instance field of the class and of its superclasses, decorated or not.
 * It skips methods, accessors, symbol keys, `#private` fields and functions. Subclasses inherit the
 * method, so they need no decorator of their own.
 *
 * The values in the fields serialize as follows:
 *
 * - A value with a {@link TO_REFERENCE} method serializes as the result of that method.
 * - A value with a `toJSON()` method serializes as its result, with no change to its keys.
 * - A plain object gets snake_case keys. An array serializes each element.
 * - Other class instances serialize their instance fields, also if their class has no decorator.
 * - A `Map` or a `Set` throws {@link UnsupportedJsonValueError}.
 *
 * An empty array or object is omitted only when it is the value of a field. Inside other values, it
 * stays.
 *
 * @example
 *     @serialize
 *     class Dirt {
 *         destroySpeed = 2;
 *         @serialize({ rename: "minecraft:light" }) light = 4;
 *         @serialize({ within: "description" }) identifier = "example:dirt";
 *         tags: string[] = [];
 *     }
 *
 *     JSON.stringify(new Dirt());
 *     // {"destroy_speed":2,"minecraft:light":4,"description":{"identifier":"example:dirt"}}
 */
export function serialize(target: abstract new (...args: never[]) => object): void;
/**
 * Sets the {@link FieldOptions} of a field.
 *
 * The options have an effect only if the class or one of its superclasses also has `@serialize`.
 * Subclasses inherit the options. A subclass can decorate an inherited field again. Then its
 * options replace only the options that it sets.
 *
 * Invalid combinations of options throw when an instance of the class first serializes, not when
 * the class is defined.
 *
 * @example
 *     @serialize
 *     class Light {
 *         @serialize({ transparent: true }) level = 4;
 *         color?: string;
 *     }
 *
 *     JSON.stringify(new Light()); // 4
 *
 * @throws - {@link DecoratedNonFieldError} if the member is a static field, a method or an
 *   accessor.
 */
export function serialize<T, This extends object = object>(
    options: FieldOptions<T, This>,
): FieldDecorator<This>;
export function serialize(
    arg: FieldOptions | (abstract new (...args: never[]) => object),
): FieldDecorator | undefined {
    if (typeof arg === "function") {
        Object.defineProperty(arg.prototype, "toJSON", {
            configurable: true,
            writable: true,
            value(this: object): unknown {
                return serializeInstance(this);
            },
        });
        return undefined;
    }

    return (prototype, name) => {
        // Decorators on static members receive the class itself. Methods and accessors are own
        // properties of the prototype, which instance fields never are.
        if (typeof prototype === "function" || Object.hasOwn(prototype, name)) {
            throw new DecoratedNonFieldError(name);
        }
        let fields = OPTIONS.get(prototype);
        if (fields === undefined) {
            fields = new Map();
            OPTIONS.set(prototype, fields);
        }
        fields.set(name, arg);
    };
}

interface FieldSchema {
    readonly key: string;
    readonly within: readonly string[];
    readonly toJson: (value: unknown, instance: object) => unknown;
}

class Schema {
    readonly #className: string;
    readonly #fields = new Map<string, FieldSchema>();
    readonly #objects = new Set<string>();
    readonly #values = new Set<string>();
    readonly transparentKey: string | undefined;

    constructor(className: string, options: ReadonlyMap<string, FieldOptions>) {
        this.#className = className;
        let transparent: string | undefined = undefined;
        for (const [name, field] of options) {
            if (field.transparent) {
                if (transparent !== undefined) {
                    throw new MultipleTransparentFieldsError(className, transparent, name);
                }
                if (field.within) {
                    throw new NestedTransparentFieldError(className, name);
                }
                transparent = name;
            }
            this.#add(name, field);
        }
        this.transparentKey = transparent && this.field(transparent).key;
    }

    field(name: string): FieldSchema {
        return this.#fields.get(name) ?? this.#add(name, {});
    }

    #add(name: string, options: FieldOptions): FieldSchema {
        const { keepKeys, override, rename, within } = options;

        const convert = keepKeys ? keepKeysToJson : toJson;
        const field: FieldSchema = {
            key: rename ?? toSnakeCase(name),
            within: typeof within === "string" ? [within] : (within ?? []),
            toJson:
                override !== undefined
                    ? (value, instance) => convert(override(value, instance))
                    : (value) => omitEmpty(convert(value)),
        };

        let path = "";
        for (const segment of field.within) {
            path += `${segment}/`;
            if (this.#values.has(path)) throw new DuplicateJsonKeyError(this.#className, segment);
            this.#objects.add(path);
        }
        path += `${field.key}/`;
        if (this.#values.has(path) || this.#objects.has(path)) {
            throw new DuplicateJsonKeyError(this.#className, field.key);
        }

        this.#values.add(path);
        this.#fields.set(name, field);
        return field;
    }
}

function schemaOf(ctor: { readonly name: string; readonly prototype: object }): Schema {
    let schema = SCHEMAS.get(ctor);
    if (schema === undefined) {
        schema = new Schema(ctor.name, resolveOptions(ctor));
        SCHEMAS.set(ctor, schema);
    }
    return schema;
}

function resolveOptions(ctor: { readonly prototype: object }): Map<string, FieldOptions> {
    const owners: object[] = [];
    let proto: object | null = ctor.prototype;
    while (proto !== null) {
        owners.unshift(proto);
        proto = Object.getPrototypeOf(proto) as object | null;
    }

    const resolved = new Map<string, FieldOptions>();
    for (const owner of owners) {
        for (const [name, options] of OPTIONS.get(owner) ?? []) {
            resolved.set(name, { ...resolved.get(name), ...options });
        }
    }
    return resolved;
}

function serializeInstance(obj: object): unknown {
    const schema = schemaOf(obj.constructor);
    const out: Record<string, unknown> = {};
    for (const name of Object.keys(obj)) {
        const field = schema.field(name);
        const json = field.toJson((obj as Record<string, unknown>)[name], obj);
        if (json === undefined) continue;
        let target = out;
        for (const segment of field.within) {
            target = (target[segment] ??= {}) as Record<string, unknown>;
        }
        target[field.key] = json;
    }
    const keys = Object.keys(out);
    const { transparentKey } = schema;
    return keys.length === 1 && keys[0] === transparentKey ? out[transparentKey] : out;
}

function toJson(value: unknown): unknown {
    if (typeof value === "function") return undefined;
    if (typeof value !== "object" || value === null) return value;
    if (TO_REFERENCE in value) return (value as { [TO_REFERENCE](): unknown })[TO_REFERENCE]();
    if (typeof (value as { toJSON?: unknown }).toJSON === "function") {
        return (value as { toJSON(): unknown }).toJSON();
    }
    if (Array.isArray(value)) return value.map(toJson);
    if (isPlainObject(value)) return recordToJson(value, toSnakeCase);
    if (value instanceof Map || value instanceof Set) {
        throw new UnsupportedJsonValueError(value.constructor.name);
    }
    return serializeInstance(value);
}

function keepKeysToJson(value: unknown): unknown {
    return isPlainObject(value) ? recordToJson(value, (key) => key) : toJson(value);
}

function recordToJson(
    record: Record<string, unknown>,
    toKey: (key: string) => string,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key in record) {
        const json = toJson(record[key]);
        if (json !== undefined) out[toKey(key)] = json;
    }
    return out;
}

function omitEmpty(json: unknown): unknown {
    const isEmpty = Array.isArray(json)
        ? json.length === 0
        : isPlainObject(json) && Object.keys(json).length === 0;
    return isEmpty ? undefined : json;
}

const SNAKE_CASE_CACHE = new Map<string, string>();
const CASEABLE = /^[A-Za-z][A-Za-z0-9]*$/;

function toSnakeCase(name: string): string {
    if (!CASEABLE.test(name)) return name;
    let key = SNAKE_CASE_CACHE.get(name);
    if (key === undefined) {
        key = name.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
        SNAKE_CASE_CACHE.set(name, key);
    }
    return key;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== "object") return false;
    const proto: object | null = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
