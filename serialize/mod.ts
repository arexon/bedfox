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
import { toCamelCase, toKebabCase, toPascalCase, toSnakeCase } from "@std/text";

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

/** Which casing to use for serialized fields. */
export const enum FieldCasing {
    Camel,
    Kebab,
    Pascal,
    Snake,
}

/** Options to use in {@link createSer}. */
export interface GlobalOptions {
    /**
     * The field casing to use for all fields.
     *
     * Default: camelCase
     */
    fieldCasing?: FieldCasing;
    /**
     * Whether to require other fields to be undefined for
     * {@link ClassOptions.transparent} to apply.
     *
     * Default: true
     */
    requireUndefinedForTransparency?: boolean;
}

/** Options to configure how a class should be serialized. */
export interface ClassOptions {
    /**
     * A field (instance field or getter) to use as the serialized
     * value for the class.
     *
     * This will only apply if every other field annotated with {@link Ser} is
     * undefined at serialization-time. However, this can be changed with
     * {@link GlobalOptions.requireUndefinedForTransparency}.
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
     * When {@link FieldOptions.default} is set, it will compare against the
     * custom value.
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

/** Creates a custom {@link Ser} decorator with configured {@link GlobalOptions}. */
export function createSer(
    globalOptions: GlobalOptions = {},
): <Ctx extends ClassDecoratorContext | ClassFieldDecoratorContext>(
    options?: Ctx extends { kind: "class" } ? ClassOptions : FieldOptions<
        Ctx extends ClassFieldDecoratorContext<unknown, infer V> ? V : never,
        Ctx extends ClassFieldDecoratorContext<infer V, unknown> ? V : never
    >,
) => (
    target: Ctx extends { kind: "class" } ? AnyConstructor : undefined,
    ctx: Ctx,
) => void {
    return function Ser(
        options,
    ): (
        target: AnyConstructor | undefined,
        ctx: ClassDecoratorContext | ClassFieldDecoratorContext,
    ) => void {
        return (target, ctx) => {
            if (ctx.kind === "field") {
                return fieldImpl(ctx, globalOptions, options as FieldOptions);
            } else if (ctx.kind === "class") {
                classImpl(ctx, target!, globalOptions, options as ClassOptions);
            }
        };
    };
}

/**
 * A decorator to apply on classes or instance fields.
 *
 * It implements `toJSON()` on the class prototype
 */
export const Ser: ReturnType<typeof createSer> = createSer();

interface ContextMetadata {
    readonly metadata: {
        [Metadata.symbol]?: Metadata;
    };
}

function fieldImpl(
    ctx: ClassFieldDecoratorContext & ContextMetadata,
    globalOptions: GlobalOptions,
    options: FieldOptions,
): void {
    ctx.metadata[Metadata.symbol] ??= new Metadata("", globalOptions);
    if (typeof ctx.name !== "symbol") {
        ctx.metadata[Metadata.symbol]!.setField(ctx.name, options ?? {});
    }
}

function classImpl(
    ctx: ClassDecoratorContext & ContextMetadata,
    ctor: AnyConstructor,
    globalOptions: GlobalOptions,
    options: ClassOptions,
): void {
    if ("toJSON" in ctor.prototype) {
        throw new DuplicateToJsonError(ctor.name);
    }

    ctx.metadata[Metadata.symbol] ??= new Metadata("", globalOptions);
    const metadata = ctx.metadata[Metadata.symbol]!;

    metadata.transparent = options?.transparent;

    // The order of class decorator is a bit odd, so this ensures we'll eventually
    // have the class name.
    if (metadata.className === "") metadata.className = ctor.name;

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
const RESULT_VAR = "result";
const FIELDS_METADATA_VAR = "fieldsMetadata";

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
    fieldCasingFn: (s: string) => string;
    requireUndefinedForTransparency: boolean;

    constructor(className: string, globalOptions: GlobalOptions) {
        this.className = className;
        switch (globalOptions.fieldCasing ?? FieldCasing.Camel) {
            case FieldCasing.Camel:
                this.fieldCasingFn = toCamelCase;
                break;
            case FieldCasing.Kebab:
                this.fieldCasingFn = toKebabCase;
                break;
            case FieldCasing.Pascal:
                this.fieldCasingFn = toPascalCase;
                break;
            case FieldCasing.Snake:
                this.fieldCasingFn = toSnakeCase;
                break;
        }
        this.requireUndefinedForTransparency =
            globalOptions.requireUndefinedForTransparency ?? true;
    }

    setField(name: string, options: FieldOptions): void {
        this.fields[name] = {
            index: this.fieldsCount,
            name,
            custom: options.custom !== undefined ? options.custom : undefined,
            default: options.default,
            rename: options.rename,
            path: options.path?.split("/"),
        };
        this.fieldsCount++;
    }

    getKey(name: string): string {
        const field = this.fields[name];
        if (field.rename !== undefined) {
            return field.rename;
        } else if (CASEABLE_NAME.test(field.name)) {
            return this.fieldCasingFn(field.name);
        } else {
            return field.name;
        }
    }
}

type ObjectProps = { [key: string]: string | ObjectProps };

function generateToJson(metadata: Metadata): string {
    let body = "";
    const objectProps: ObjectProps = {};
    const transparencyChecks: string[] = [];
    const consts: [string, string][] = [];

    if (metadata.fieldsCount > 0) {
        for (const field of Object.values(metadata.fields)) {
            const isNotTransparent = metadata.transparent !== undefined &&
                field.name !== metadata.transparent;
            const key = metadata.getKey(field.name);
            let value = thisProp(field.name);

            const transparencyCheck = [];
            if (isNotTransparent && metadata.requireUndefinedForTransparency) {
                transparencyCheck.push(`${value}===undefined`);
            }

            if (field.default !== undefined || field.custom !== undefined) {
                if (consts.length === 0) {
                    consts.push([
                        FIELDS_METADATA_VAR,
                        `this.constructor[Symbol.metadata][${Metadata.symbolName}]`,
                    ]);
                }
            }

            if (field.custom !== undefined) {
                const customOverride = CUSTOM_OVERRIDE_PREFIX + field.index;
                consts.push([
                    customOverride,
                    `${fieldMeta(field.name)}.custom.call(this,${value})`,
                ]);
                value = customOverride;
            }

            if (field.default !== undefined) {
                const isDefault = `equal(${fieldMeta(field.name)}.default(),${
                    thisProp(field.name)
                })`;
                if (
                    isNotTransparent && metadata.requireUndefinedForTransparency
                ) {
                    transparencyCheck.push(isDefault);
                }
                value = `${isDefault}?undefined:${value}`;
            }

            if (field.path !== undefined) {
                let current = objectProps;
                for (const part of field.path) {
                    current[part] ??= {};
                    current = current[part] as ObjectProps;
                }
                current[key] = value;
            } else {
                objectProps[key] = value;
            }

            if (isNotTransparent && metadata.requireUndefinedForTransparency) {
                transparencyChecks.push(`(${transparencyCheck.join("||")})`);
            }
        }

        const appendObjectProps = (objectProps: ObjectProps) => {
            body += "{";
            for (const [key, value] of Object.entries(objectProps)) {
                body += `${JSON.stringify(key)}:`;
                if (typeof value === "string") {
                    body += value;
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

        if (
            transparencyChecks.length > 0 &&
            metadata.requireUndefinedForTransparency
        ) {
            body += `const ${RESULT_VAR}=`;
            appendObjectProps(objectProps);
            body += ";";
        } else if (metadata.transparent === undefined) {
            body += "return ";
            appendObjectProps(objectProps);
            body += ";";
        }

        if (metadata.transparent !== undefined) {
            const transparentField = metadata.fields[metadata.transparent]!;
            if (transparentField === undefined) {
                throw new UnknownTransparentFieldError(
                    metadata.className,
                    metadata.transparent,
                );
            }

            let value: string;
            if (transparentField.custom !== undefined) {
                value = CUSTOM_OVERRIDE_PREFIX + transparentField.index;
            } else {
                value = thisProp(transparentField.name);
            }

            value = `${value}?.toJSON?.()??${value}`;

            if (
                transparencyChecks.length > 0 &&
                metadata.requireUndefinedForTransparency
            ) {
                body += `if(${transparencyChecks.join("&&")})return ${value};`;
            } else {
                body += `return ${value};`;
            }
        }

        if (transparencyChecks.length > 0) {
            body += `return ${RESULT_VAR};`;
        }
    } else if (metadata.transparent !== undefined) {
        body += `return ${thisProp(metadata.transparent)};`;
    } else {
        body += "return {};";
    }

    return body;
}
