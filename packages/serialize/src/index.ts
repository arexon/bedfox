/**
 * TypeScript serialization library that eliminates the need for manually implementing `toJSON()` on
 * classes by utilizing TypeScript's `experimentalDecorators` and autogenerating optimized methods.
 *
 * @module
 */

import { isDeepStrictEqual } from "node:util";

/** Options to configure how a class should be serialized. */
export interface ClassOptions {
    /**
     * A field (instance field or getter) to use as the serialized value for the class.
     *
     * This only applies if every other decorated field is undefined (or at its
     * {@link FieldOptions.default}) at serialization-time.
     */
    transparent?: string;
}

/** Options to configure how a field should be serialized. */
export interface FieldOptions<FieldValue = unknown, This = unknown> {
    /**
     * A callback that returns the default value for this field.
     *
     * During serialization, the default value is compared against the field's current value. If it
     * matches, the field is omitted.
     */
    default?: () => FieldValue;
    /**
     * Returns a custom value to override the serialized field value.
     *
     * When {@link FieldOptions.default} is set, it is compared against the field's current value,
     * not the custom output.
     */
    custom?(this: This, value: FieldValue): unknown;
    /** A custom name for the serialized field. */
    rename?: string;
    /**
     * A path within the serialized object to place this field, delimited by "/". Each part is
     * created as an object when needed.
     */
    path?: string;
}

/** An error caused by an unknown transparent field. */
export class UnknownTransparentFieldError extends TypeError {
    constructor(className: string, fieldName: string) {
        super(
            `Cannot find a matching instance/getter field named '${fieldName}' in class '${className}'`,
        );
    }
}

/** An error caused by an existing `toJSON()` method. */
export class DuplicateToJsonError extends TypeError {
    constructor(className: string) {
        super(`Class '${className}' already has a toJSON() method defined`);
    }
}

/** An error caused by two fields claiming the same serialized key or path. */
export class PathCollisionError extends TypeError {
    constructor(className: string, key: string) {
        super(`Serialized key '${key}' collides in class '${className}'`);
    }
}

/** An error caused by a path containing an empty segment. */
export class InvalidPathError extends TypeError {
    constructor(path: string) {
        super(`Path '${path}' contains an empty segment`);
    }
}

/** An error caused by decorating a symbol-named field. */
export class SymbolFieldError extends TypeError {
    constructor() {
        super("Symbol fields cannot be serialized");
    }
}

/**
 * A decorator to apply on classes or instance fields.
 *
 * It implements `toJSON()` on the class prototype. Field names are converted to snake_case.
 */
export function Ser<This, Key extends string = never>(
    options?: [Key] extends [never]
        ? ClassOptions
        : Key extends keyof This
          ? FieldOptions<This[Key], This>
          : never,
): (target: This, key?: Key) => void {
    return (target, key) => {
        if (key === undefined) {
            Compiler.decorateClass(
                target as abstract new (...args: never[]) => unknown,
                options as ClassOptions,
            );
        } else {
            Compiler.decorateField(target as object, key, options as FieldOptions);
        }
    };
}

interface Field {
    index: number;
    default?: () => unknown;
    custom?(this: unknown, value: unknown): unknown;
    rename?: string;
    path?: string[];
}

interface RuntimeField {
    default?: () => unknown;
    custom?(this: unknown, value: unknown): unknown;
}

type Fields = Record<string, Field>;
type RuntimeFields = Record<string, RuntimeField>;
type ObjectProps = { [key: string]: string | ObjectProps };

interface Plan {
    consts: [string, string][];
    tree: ObjectProps;
    transparency: string[];
    runtime: RuntimeFields;
    transparent?: string;
}

class Compiler {
    static readonly #CASEABLE_NAME = /^[A-Za-z][A-Za-z0-9]*$/;
    static readonly #CUSTOM_OVERRIDE_PREFIX = "customOverride";
    static readonly #EQUAL_VAR = "equal";
    static readonly #IS_DEFAULT_PREFIX = "isDefault";
    static readonly #RESULT_VAR = "result";
    static readonly #RUNTIME_VAR = "runtime";
    static readonly #TRANSPARENT_VAR = "transparent";
    static readonly #PENDING = new WeakMap<object, Compiler>();

    readonly #fields: Fields = {};

    /** Field decorators run first and collect fields on the prototype. */
    static decorateField(prototype: object, key: string | symbol, options?: FieldOptions): void {
        if (typeof key === "symbol") {
            throw new SymbolFieldError();
        }
        Compiler.#for(prototype).#addField(key, options ?? {});
    }

    static decorateClass(
        ctor: abstract new (...args: never[]) => unknown,
        options?: ClassOptions,
    ): void {
        if ("toJSON" in ctor.prototype) {
            throw new DuplicateToJsonError(ctor.name);
        }

        const prototype = ctor.prototype as object;
        const compiler = Compiler.#for(prototype);
        Compiler.#PENDING.delete(prototype);
        const transparent = options?.transparent;
        if (
            transparent !== undefined &&
            !(transparent in compiler.#fields) &&
            !(transparent in ctor.prototype)
        ) {
            throw new UnknownTransparentFieldError(ctor.name, transparent);
        }

        const plan = compiler.#analyze(ctor.name, transparent);
        // oxlint-disable-next-line typescript/no-implied-eval
        const fn = new Function(Compiler.#RUNTIME_VAR, Compiler.#EQUAL_VAR, compiler.#print(plan));
        const runtime = plan.runtime;

        Object.defineProperty(ctor.prototype, "toJSON", {
            value() {
                return fn.call(this, runtime, isDeepStrictEqual);
            },
            configurable: true,
            writable: true,
        });
    }

    static #for(prototype: object): Compiler {
        let compiler = Compiler.#PENDING.get(prototype);
        if (compiler === undefined) {
            compiler = new Compiler();
            Compiler.#PENDING.set(prototype, compiler);
        }
        return compiler;
    }

    #addField(name: string, options: FieldOptions): void {
        let path: string[] | undefined;
        if (options.path !== undefined) {
            path = options.path.split("/");
            if (path.some((part) => part === "")) {
                throw new InvalidPathError(options.path);
            }
        }
        this.#fields[name] = {
            index: Object.keys(this.#fields).length,
            // oxlint-disable-next-line
            custom: options.custom,
            default: options.default,
            rename: options.rename,
            path,
        };
    }

    #analyze(className: string, transparent?: string): Plan {
        const plan: Plan = {
            consts: [],
            tree: {},
            transparency: [],
            runtime: {},
        };
        const names = Object.keys(this.#fields);

        if (names.length === 0) {
            if (transparent !== undefined) {
                plan.transparent = Compiler.#thisProp(transparent);
            }
            return plan;
        }

        for (const name of names) {
            const field = this.#fields[name];
            const isNotTransparent = transparent !== undefined && name !== transparent;
            const key = Compiler.#serializedKey(name, field);
            let value = Compiler.#thisProp(name);

            if (field.custom !== undefined || field.default !== undefined) {
                plan.runtime[name] = {
                    // oxlint-disable-next-line typescript/unbound-method
                    custom: field.custom,
                    default: field.default,
                };
            }

            const transparencyCheck = [];
            if (isNotTransparent) {
                transparencyCheck.push(`${value}===undefined`);
            }

            const customExpr =
                field.custom === undefined
                    ? undefined
                    : `${Compiler.#fieldRuntime(name)}.custom.call(this,${value})`;

            if (field.custom !== undefined && field.default === undefined) {
                const customOverride = Compiler.#CUSTOM_OVERRIDE_PREFIX + field.index;
                plan.consts.push([customOverride, customExpr!]);
                value = customOverride;
            }

            if (field.default !== undefined) {
                const isDefault = Compiler.#IS_DEFAULT_PREFIX + field.index;
                plan.consts.push([
                    isDefault,
                    `${Compiler.#EQUAL_VAR}(${Compiler.#fieldRuntime(name)}.default(),${Compiler.#thisProp(
                        name,
                    )})`,
                ]);
                if (isNotTransparent) {
                    transparencyCheck.push(isDefault);
                }
                value =
                    field.custom === undefined
                        ? `${isDefault}?undefined:${value}`
                        : `${isDefault}?undefined:${customExpr}`;
            }

            let current = plan.tree;
            for (const part of field.path ?? []) {
                if (part in current) {
                    if (typeof current[part] === "string") {
                        throw new PathCollisionError(className, part);
                    }
                    current = current[part];
                } else {
                    current = current[part] = {};
                }
            }
            if (key in current) {
                throw new PathCollisionError(className, key);
            }
            current[key] = value;

            if (isNotTransparent) {
                plan.transparency.push(`(${transparencyCheck.join("||")})`);
            }
        }

        if (transparent !== undefined) {
            const field = this.#fields[transparent];
            if (field?.custom !== undefined) {
                plan.transparent =
                    field.default === undefined
                        ? Compiler.#CUSTOM_OVERRIDE_PREFIX + field.index
                        : `${Compiler.#fieldRuntime(
                              transparent,
                          )}.custom.call(this,${Compiler.#thisProp(transparent)})`;
            } else {
                plan.transparent = Compiler.#thisProp(transparent);
            }
        }

        return plan;
    }

    #print(plan: Plan): string {
        if (Object.keys(plan.tree).length === 0 && plan.transparent === undefined) {
            return "return{};";
        }

        let body = "";
        for (const [name, value] of plan.consts) {
            body += `const ${name}=${value};`;
        }

        if (plan.transparent !== undefined && plan.transparency.length === 0) {
            return body + Compiler.#transparentReturn(plan.transparent);
        }

        body += `const ${Compiler.#RESULT_VAR}={};`;
        body += this.#printAssigns(plan.tree);
        if (plan.transparent !== undefined) {
            body += `if(${plan.transparency.join("&&")}){${Compiler.#transparentReturn(
                plan.transparent,
            )}}`;
        }
        return body + `return ${Compiler.#RESULT_VAR};`;
    }

    #printAssigns(props: ObjectProps, path: string[] = []): string {
        let out = "";
        for (const [key, value] of Object.entries(props)) {
            if (typeof value === "string") {
                out +=
                    `{const v=${value};` +
                    `if(v!==undefined)${this.#printAssignTarget([...path, key])}=v;}`;
            } else {
                out += this.#printAssigns(value, [...path, key]);
            }
        }
        return out;
    }

    #printAssignTarget(path: string[]): string {
        let expr = Compiler.#RESULT_VAR;
        for (let i = 0; i < path.length - 1; i++) {
            expr = `(${expr}[${JSON.stringify(path[i])}]??={})`;
        }
        return `${expr}[${JSON.stringify(path[path.length - 1])}]`;
    }

    static #serializedKey(name: string, field: Field): string {
        if (field.rename !== undefined) return field.rename;
        return Compiler.#CASEABLE_NAME.test(name) ? toSnakeCase(name) : name;
    }

    static #thisProp(name: string): string {
        return `this[${JSON.stringify(name)}]`;
    }

    static #fieldRuntime(name: string): string {
        return `${Compiler.#RUNTIME_VAR}[${JSON.stringify(name)}]`;
    }

    static #transparentReturn(expr: string): string {
        const name = Compiler.#TRANSPARENT_VAR;
        return `const ${name}=${expr};return ${name}?.toJSON?.()??${name};`;
    }
}

const WORD_OR_NUMBER = new RegExp(
    [
        /\p{Lu}\p{Ll}+/u.source, // Capitalized word, e.g. "Apple"
        /\p{Lu}+(?=(\p{Lu}\p{Ll})|\P{L}|\b)/u.source, // Acronym, e.g. "HTML"
        /(\p{Ll}+)/u.source, // Lowercase word, e.g. "apple"
        /\p{L}+/u.source, // Letters without case
        /\p{N}+/u.source, // Digits, e.g. "123"
    ].join("|"),
    "gu",
);

function toSnakeCase(input: string): string {
    return (input.trim().match(WORD_OR_NUMBER) ?? []).join("_").toLowerCase();
}
