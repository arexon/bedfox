/**
 * TypeScript serialization library that eliminates the need for manually implementing
 * [`toJSON()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior)
 * on classes by utilizing
 * [stage 3 decorators](https://github.com/tc39/proposal-decorators) and
 * autogenerating optimized methods. It also exposes options for configuring how
 * each field should be serialized.
 *
 * @module
 */

import { type AnyConstructor, equal } from "@std/assert";
import { toSnakeCase } from "@std/text";

/**
 * An error that occurs when referring to an instance or getter field in
 * {@link ClassOptions.transparent} that does not exist on the class.
 */
export class UnknownTransparentFieldError extends TypeError {
    constructor(className: string, fieldName: string) {
        super(
            `Cannot find a matching instance/getter field named '${fieldName}' in class '${className}'`,
        );
    }
}

/**
 * An error that occurs when a class already has a `toJSON()` method defined by
 * either another {@link Ser} decorator or manually implemented.
 */
export class DuplicateToJsonError extends TypeError {
    constructor(className: string) {
        super(
            `Class '${className}' already has a toJSON() method defined`,
        );
    }
}

/**
 * An error that occurs when two serialized fields claim the same key or path
 * segment (e.g. `@Ser({ path: "nested" }) x` and `@Ser() nested`).
 */
export class PathCollisionError extends TypeError {
    constructor(className: string, key: string) {
        super(
            `Serialized key '${key}' collides in class '${className}'`,
        );
    }
}

/**
 * An error that occurs when {@link FieldOptions.path} contains an empty segment
 * (e.g. `""`, `"a//b"`, `"/a"`, `"a/"`).
 */
export class InvalidPathError extends TypeError {
    constructor(path: string) {
        super(`Path '${path}' contains an empty segment`);
    }
}

/** An error that occurs when {@link Ser} is applied to a symbol-named field. */
export class SymbolFieldError extends TypeError {
    constructor() {
        super("Symbol fields cannot be serialized");
    }
}

/** Options to configure how a class should be serialized. */
export interface ClassOptions {
    /**
     * A field (instance field or getter) to use as the serialized
     * value for the class.
     *
     * This only applies if every other field annotated with {@link Ser} is
     * undefined (or at its {@link FieldOptions.default}) at serialization-time.
     */
    transparent?: string;
}

/** Options to configure how a field should be serialized. */
export interface FieldOptions<FieldValue = unknown, This = unknown> {
    /**
     * A callback that returns the default value for this field.
     *
     * During serialization, the default value is compared against the field's
     * current value. If it matches, the field is omitted. Note that the
     * comparison is deep for non-primitives.
     */
    default?: () => FieldValue;
    /**
     * Defines a callback that returns a custom value to override the serialized
     * field value.
     *
     * When {@link FieldOptions.default} is set, it is compared against the
     * field's current value (not the custom output). If they match, the field
     * is omitted.
     */
    custom?(this: This, value: FieldValue): unknown;
    /**
     * A custom name for the serialized field.
     */
    rename?: string;
    /**
     * A path within the serialized object to place this field, delimited by "/".
     *
     * Each part of the path is created as an object if it does not already exist.
     */
    path?: string;
}

/**
 * A decorator to apply on classes or instance fields.
 *
 * It implements `toJSON()` on the class prototype. Field names are converted to
 * snake_case; casing also applies to keys inside plain nested objects and arrays.
 */
export function Ser<
    Ctx extends ClassDecoratorContext | ClassFieldDecoratorContext,
>(
    options?: Ctx extends { kind: "class" } ? ClassOptions : FieldOptions<
        Ctx extends ClassFieldDecoratorContext<unknown, infer V> ? V : never,
        Ctx extends ClassFieldDecoratorContext<infer V, unknown> ? V : never
    >,
): (
    target: Ctx extends { kind: "class" } ? AnyConstructor : undefined,
    ctx: Ctx,
) => void {
    return (target, ctx) => {
        if (ctx.kind === "field") {
            return fieldImpl(ctx, options as FieldOptions);
        } else if (ctx.kind === "class") {
            classImpl(ctx, target!, options as ClassOptions);
        }
    };
}

interface ContextMetadata {
    readonly metadata: {
        [Metadata.symbol]?: Metadata;
    };
}

function fieldImpl(
    ctx: ClassFieldDecoratorContext & ContextMetadata,
    options: FieldOptions,
): (initialValue: unknown) => unknown {
    if (typeof ctx.name === "symbol") {
        throw new SymbolFieldError();
    }
    ctx.metadata[Metadata.symbol] ??= new Metadata("");
    ctx.metadata[Metadata.symbol]!.setField(ctx.name, options ?? {});
    const name = ctx.name;
    return function (this: object, initialValue: unknown): unknown {
        if (Object.hasOwn(this, name)) {
            return (this as Record<string | symbol, unknown>)[name];
        }
        return initialValue;
    };
}

function classImpl(
    ctx: ClassDecoratorContext & ContextMetadata,
    ctor: AnyConstructor,
    options: ClassOptions,
): void {
    if ("toJSON" in ctor.prototype) {
        throw new DuplicateToJsonError(ctor.name);
    }

    ctx.metadata[Metadata.symbol] ??= new Metadata("");
    const metadata = ctx.metadata[Metadata.symbol]!;

    // The order of class decorator is a bit odd, so this ensures we'll eventually
    // have the class name.
    if (metadata.className === "") metadata.className = ctor.name;

    if (options?.transparent !== undefined) {
        const name = options.transparent;
        if (!(name in metadata.fields) && !(name in ctor.prototype)) {
            throw new UnknownTransparentFieldError(ctor.name, name);
        }
        metadata.transparent = name;
    }

    const body = generateToJson(metadata);
    const fn = new Function(Metadata.symbolName, "equal", body);

    Object.defineProperty(ctor.prototype, "toJSON", {
        value(): Record<string, unknown> {
            return fn.call(this, Metadata.symbol, equal);
        },
        configurable: true,
        writable: true,
    });
}

const CASEABLE_NAME = /^[A-Za-z][A-Za-z0-9]*$/;
const CUSTOM_OVERRIDE_PREFIX = "customOverride";
const IS_DEFAULT_PREFIX = "isDefault";
const RESULT_VAR = "result";
const FIELDS_METADATA_VAR = "fieldsMetadata";
const TRANSPARENT_VAR = "transparent";

function transparentConst(expr: string): string {
    const value = `${TRANSPARENT_VAR}?.toJSON?.()??${TRANSPARENT_VAR}`;
    return `const ${TRANSPARENT_VAR}=${expr};return ${FIELDS_METADATA_VAR}.propagateCasing(${value});`;
}

function thisProp(name: string): string {
    return `this[${JSON.stringify(name)}]`;
}

function fieldMeta(name: string): string {
    return `${FIELDS_METADATA_VAR}.fields[${JSON.stringify(name)}]`;
}

interface FieldMetadata {
    index: number;
    name: string;
    default?: () => unknown;
    custom?(this: unknown, value: unknown): unknown;
    rename?: string;
    path?: string[];
}

class Metadata {
    static readonly symbol = Symbol();
    static readonly symbolName = "metadataSymbol";

    className: string;
    fieldsCount = 0;
    fields: Record<string, FieldMetadata> = {};
    transparent?: string;

    constructor(className: string) {
        this.className = className;
    }

    setField(name: string, options: FieldOptions): void {
        let path: string[] | undefined;
        if (options.path !== undefined) {
            path = options.path.split("/");
            if (path.some((p) => p === "")) {
                throw new InvalidPathError(options.path);
            }
        }
        this.fields[name] = {
            index: this.fieldsCount,
            name,
            custom: options.custom !== undefined ? options.custom : undefined,
            default: options.default,
            rename: options.rename,
            path,
        };
        this.fieldsCount++;
    }

    getKey(name: string): string {
        const field = this.fields[name];
        if (field.rename !== undefined) {
            return field.rename;
        } else if (CASEABLE_NAME.test(field.name)) {
            return toSnakeCase(field.name);
        } else {
            return field.name;
        }
    }

    propagateCasing(value: unknown): unknown {
        if (value === null || typeof value !== "object") return value;
        if (typeof (value as { toJSON?: unknown }).toJSON === "function") {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map((v) => this.propagateCasing(v));
        }
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
            out[CASEABLE_NAME.test(k) ? toSnakeCase(k) : k] = this
                .propagateCasing(v);
        }
        return out;
    }
}

type ObjectProps = { [key: string]: string | ObjectProps };

function generateToJson(metadata: Metadata): string {
    let body = "";
    const objectProps: ObjectProps = {};
    const transparencyChecks: string[] = [];
    const consts: [string, string][] = [];
    const fieldsMetadata =
        `this.constructor[Symbol.metadata][${Metadata.symbolName}]`;

    if (metadata.fieldsCount > 0) {
        consts.push([FIELDS_METADATA_VAR, fieldsMetadata]);

        for (const field of Object.values(metadata.fields)) {
            const isNotTransparent = metadata.transparent !== undefined &&
                field.name !== metadata.transparent;
            const key = metadata.getKey(field.name);
            let value = thisProp(field.name);

            const transparencyCheck = [];
            if (isNotTransparent) {
                transparencyCheck.push(`${value}===undefined`);
            }

            const customExpr = field.custom !== undefined
                ? `${fieldMeta(field.name)}.custom.call(this,${value})`
                : undefined;

            if (field.custom !== undefined && field.default === undefined) {
                const customOverride = CUSTOM_OVERRIDE_PREFIX + field.index;
                consts.push([customOverride, customExpr!]);
                value = customOverride;
            }

            if (field.default !== undefined) {
                const isDefaultVar = IS_DEFAULT_PREFIX + field.index;
                consts.push([
                    isDefaultVar,
                    `equal(${fieldMeta(field.name)}.default(),${
                        thisProp(field.name)
                    })`,
                ]);
                if (isNotTransparent) {
                    transparencyCheck.push(isDefaultVar);
                }
                value = field.custom !== undefined
                    ? `${isDefaultVar}?undefined:${customExpr}`
                    : `${isDefaultVar}?undefined:${value}`;
            }

            if (field.path !== undefined) {
                let current = objectProps;
                for (const part of field.path) {
                    if (part in current) {
                        if (typeof current[part] === "string") {
                            throw new PathCollisionError(
                                metadata.className,
                                part,
                            );
                        }
                        current = current[part] as ObjectProps;
                    } else {
                        const next: ObjectProps = {};
                        current[part] = next;
                        current = next;
                    }
                }
                if (key in current) {
                    throw new PathCollisionError(metadata.className, key);
                }
                current[key] = value;
            } else {
                if (key in objectProps) {
                    throw new PathCollisionError(metadata.className, key);
                }
                objectProps[key] = value;
            }

            if (isNotTransparent) {
                transparencyChecks.push(`(${transparencyCheck.join("||")})`);
            }
        }

        const appendObjectProps = (props: ObjectProps): void => {
            body += "{";
            for (const [key, value] of Object.entries(props)) {
                body += `${JSON.stringify(key)}:`;
                if (typeof value === "string") {
                    body += `${FIELDS_METADATA_VAR}.propagateCasing(${value})`;
                } else {
                    appendObjectProps(value);
                }
                body += ",";
            }
            body += "}";
        };

        for (const [name, value] of consts) {
            body += `const ${name}=${value};`;
        }

        if (transparencyChecks.length > 0) {
            body += `const ${RESULT_VAR}=`;
            appendObjectProps(objectProps);
            body += ";";
        } else if (metadata.transparent === undefined) {
            body += "return ";
            appendObjectProps(objectProps);
            body += ";";
        }

        if (metadata.transparent !== undefined) {
            const transparentField = metadata.fields[metadata.transparent];
            let value: string;
            if (transparentField?.custom !== undefined) {
                value = transparentField.default === undefined
                    ? CUSTOM_OVERRIDE_PREFIX + transparentField.index
                    : `${fieldMeta(transparentField.name)}.custom.call(this,${
                        thisProp(transparentField.name)
                    })`;
            } else {
                value = thisProp(metadata.transparent);
            }

            if (transparencyChecks.length > 0) {
                body += `if(${transparencyChecks.join("&&")}){${
                    transparentConst(value)
                }}`;
                body += `return ${RESULT_VAR};`;
            } else {
                body += transparentConst(value);
            }
        } else if (transparencyChecks.length > 0) {
            body += `return ${RESULT_VAR};`;
        }
    } else if (metadata.transparent !== undefined) {
        body += `const ${FIELDS_METADATA_VAR}=${fieldsMetadata};`;
        body += transparentConst(thisProp(metadata.transparent));
    } else {
        body += "return{};";
    }

    return body;
}
