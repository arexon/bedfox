/** Options of each decorated field, keyed by the prototype that declares it. */
const OPTIONS = new WeakMap<object, Map<string, FieldOptions>>();

/** Each class's schema, built on first use so that every decorator has already run. */
const SCHEMAS = new WeakMap<object, Schema>();

/**
 * Method key for values that serialize as a reference when nested in another value, e.g. a
 * definition as its identifier.
 */
export const TO_REFERENCE: unique symbol = Symbol("to_reference");

/** A field decorator, only allowed on classes whose instances are `This`. */
export type FieldDecorator<This extends object = object> = (prototype: This, name: string) => void;

/** How a field of type `T`, on instances of `This`, serializes. Every option is off by default. */
export interface FieldOptions<T = unknown, This extends object = object> {
    /** The JSON key, instead of the snake_cased field name. */
    rename?: string;
    /**
     * Nested objects to place the field inside, e.g. `["description", "menu_category"]`. Can't be
     * combined with {@link transparent}.
     */
    within?: string | readonly string[];
    /**
     * Keeps the keys of the field's record as written instead of snake_casing them, e.g. for
     * user-chosen names. Keys of records nested deeper are still snake_cased.
     */
    keepKeys?: boolean;
    /**
     * Makes the field's value replace the whole object when it's the only field set. Can't be
     * combined with {@link within}.
     */
    transparent?: boolean;
    /**
     * Maps the field's value before it's serialized, given the instance it belongs to. Returning
     * `undefined` omits the field. Unlike other fields, an empty array or object returned here is
     * kept.
     */
    override?: (value: T | undefined, instance: This) => unknown;
}

/** An error caused by {@link serialize()} on a static field, method or accessor. */
export class DecoratedNonFieldError extends TypeError {
    constructor(name: string) {
        super(`@serialize() only works on instance fields, not '${name}'`);
        this.name = "DecoratedNonFieldError";
    }
}

/** An error caused by a class with more than one {@link FieldOptions.transparent} field. */
export class MultipleTransparentFieldsError extends TypeError {
    constructor(className: string, first: string, second: string) {
        super(`'${className}' has two transparent fields, '${first}' and '${second}'`);
        this.name = "MultipleTransparentFieldsError";
    }
}

/**
 * An error caused by a {@link FieldOptions.transparent} field placed {@link FieldOptions.within} a
 * nested object, so it can't collapse.
 */
export class NestedTransparentFieldError extends TypeError {
    constructor(className: string, field: string) {
        super(`'${className}.${field}' can't be both transparent and within a nested object`);
        this.name = "NestedTransparentFieldError";
    }
}

/** An error caused by more than one field serializing under the same key. */
export class DuplicateJsonKeyError extends TypeError {
    constructor(className: string, key: string) {
        super(`'${className}' serializes more than one field under '${key}'`);
        this.name = "DuplicateJsonKeyError";
    }
}

/** An error caused by a value that has no JSON form, such as a `Map`. */
export class UnsupportedJsonValueError extends TypeError {
    constructor(type: string) {
        super(`${type} can't be serialized to JSON`);
        this.name = "UnsupportedJsonValueError";
    }
}

/**
 * Configures how a class serializes to JSON.
 *
 * On a class, it installs a `toJSON()` that serializes every instance field, decorated or not. On a
 * field, it sets that field's {@link FieldOptions}.
 */
export function serialize(target: abstract new (...args: never[]) => object): void;
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

/** How one field serializes. */
interface FieldSchema {
    readonly key: string;
    readonly within: readonly string[];
    /** The field's JSON, or `undefined` to omit it. */
    readonly toJson: (value: unknown, instance: object) => unknown;
}

/** How a class serializes: its fields, resolved from its decorators and its bases'. */
class Schema {
    readonly #className: string;
    readonly #fields = new Map<string, FieldSchema>();
    /**
     * Key paths already taken, each segment followed by `/`, used to catch collisions. `#objects`
     * holds the nested objects made by `within`, and `#values` holds the fields themselves.
     */
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

/** The options of every decorated field of `ctor`, base classes first so subclasses win. */
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

/** Serializes a class instance as described by its schema. */
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

/**
 * Converts a value to JSON:
 *
 * - A value with a {@link TO_REFERENCE} method becomes that reference.
 * - A value with a `toJSON()` method becomes its result, which isn't converted further.
 * - Arrays are converted item by item, and plain objects key by key, snake_casing keys and dropping
 *   `undefined` values and functions.
 * - A `Map` or `Set` throws {@link UnsupportedJsonValueError}.
 * - Any other class instance is serialized like a {@link serialize()} class.
 */
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

/**
 * Converts a camelCase name to snake_case. Only pure alphanumeric names are converted, so
 * namespaced keys like `minecraft:cardinal_direction` pass through.
 */
function toSnakeCase(name: string): string {
    if (!CASEABLE.test(name)) return name;
    let key = SNAKE_CASE_CACHE.get(name);
    if (key === undefined) {
        key = name.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
        SNAKE_CASE_CACHE.set(name, key);
    }
    return key;
}

/** Whether `value` is an object literal (or `Object.create(null)`), as opposed to a class instance. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== "object") return false;
    const proto: object | null = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
