/**
 * TypeScript serialization library that eliminates the need for manually
 * implementing `toJSON()` on classes by utilizing stage 3 decorators and
 * autogenerating optimized methods.
 *
 * @module
 */

import { equal } from "@std/assert";
import { toSnakeCase } from "@std/text";

/** Options to configure how a class should be serialized. */
export interface ClassOptions {
    /**
     * A field (instance field or getter) to use as the serialized value for the
     * class.
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
     * During serialization, the default value is compared against the field's
     * current value. If it matches, the field is omitted. The comparison is
     * deep for non-primitives.
     */
    default?: () => FieldValue;
    /**
     * Returns a custom value to override the serialized field value.
     *
     * When {@link FieldOptions.default} is set, it is compared against the
     * field's current value, not the custom output.
     */
    custom?(this: This, value: FieldValue): unknown;
    /** A custom name for the serialized field. */
    rename?: string;
    /**
     * A path within the serialized object to place this field, delimited by
     * "/". Each part is created as an object when needed.
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
 * It implements `toJSON()` on the class prototype. Field names are converted
 * to snake_case.
 */
export function Ser<
    Ctx extends ClassDecoratorContext | ClassFieldDecoratorContext,
>(
    options?: Ctx extends { kind: "class" } ? ClassOptions : FieldOptions<
        Ctx extends ClassFieldDecoratorContext<unknown, infer V> ? V : never,
        Ctx extends ClassFieldDecoratorContext<infer V, unknown> ? V : never
    >,
): (
    target: Ctx extends { kind: "class" }
        ? abstract new (...args: never[]) => unknown
        : undefined,
    ctx: Ctx,
) => void {
    return (target, ctx) => {
        if (ctx.kind === "field") {
            return Compiler.decorateField(ctx, options as FieldOptions);
        }
        Compiler.decorateClass(ctx, target!, options as ClassOptions);
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
    static readonly #IS_DEFAULT_PREFIX = "isDefault";
    static readonly #RESULT_VAR = "result";
    static readonly #RUNTIME_VAR = "runtime";
    static readonly #TRANSPARENT_VAR = "transparent";
    static readonly #PENDING = new WeakMap<object, Compiler>();

    readonly #fields: Fields = {};

    static decorateField(
        ctx: ClassFieldDecoratorContext,
        options?: FieldOptions,
    ): (initialValue: unknown) => unknown {
        if (typeof ctx.name === "symbol") {
            throw new SymbolFieldError();
        }

        Compiler.#for(ctx.metadata).#addField(ctx.name, options ?? {});
        return function (this: object, initialValue: unknown): unknown {
            if (Object.hasOwn(this, ctx.name)) {
                return (this as Record<string | symbol, unknown>)[ctx.name];
            }
            return initialValue;
        };
    }

    static decorateClass(
        ctx: ClassDecoratorContext,
        ctor: abstract new (...args: never[]) => unknown,
        options?: ClassOptions,
    ): void {
        if ("toJSON" in ctor.prototype) {
            throw new DuplicateToJsonError(ctor.name);
        }

        const compiler = Compiler.#for(ctx.metadata);
        Compiler.#PENDING.delete(ctx.metadata);
        const transparent = options?.transparent;
        if (
            transparent !== undefined &&
            !(transparent in compiler.#fields) &&
            !(transparent in ctor.prototype)
        ) {
            throw new UnknownTransparentFieldError(ctor.name, transparent);
        }

        const plan = compiler.#analyze(ctor.name, transparent);
        const fn = new Function(
            Compiler.#RUNTIME_VAR,
            equal.name,
            compiler.#print(plan),
        );
        const runtime = plan.runtime;

        Object.defineProperty(ctor.prototype, "toJSON", {
            value() {
                return fn.call(this, runtime, equal);
            },
            configurable: true,
            writable: true,
        });
    }

    static #for(metadata: object): Compiler {
        let compiler = Compiler.#PENDING.get(metadata);
        if (compiler === undefined) {
            compiler = new Compiler();
            Compiler.#PENDING.set(metadata, compiler);
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
            const isNotTransparent = transparent !== undefined &&
                name !== transparent;
            const key = Compiler.#serializedKey(name, field);
            let value = Compiler.#thisProp(name);

            if (field.custom !== undefined || field.default !== undefined) {
                plan.runtime[name] = {
                    custom: field.custom,
                    default: field.default,
                };
            }

            const transparencyCheck = [];
            if (isNotTransparent) {
                transparencyCheck.push(`${value}===undefined`);
            }

            const customExpr = field.custom === undefined
                ? undefined
                : `${Compiler.#fieldRuntime(name)}.custom.call(this,${value})`;

            if (field.custom !== undefined && field.default === undefined) {
                const customOverride = Compiler.#CUSTOM_OVERRIDE_PREFIX +
                    field.index;
                plan.consts.push([customOverride, customExpr!]);
                value = customOverride;
            }

            if (field.default !== undefined) {
                const isDefault = Compiler.#IS_DEFAULT_PREFIX + field.index;
                plan.consts.push([
                    isDefault,
                    `equal(${Compiler.#fieldRuntime(name)}.default(),${
                        Compiler.#thisProp(name)
                    })`,
                ]);
                if (isNotTransparent) {
                    transparencyCheck.push(isDefault);
                }
                value = field.custom === undefined
                    ? `${isDefault}?undefined:${value}`
                    : `${isDefault}?undefined:${customExpr}`;
            }

            let current = plan.tree;
            for (const part of field.path ?? []) {
                if (part in current) {
                    if (typeof current[part] === "string") {
                        throw new PathCollisionError(className, part);
                    }
                    current = current[part] as ObjectProps;
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
                plan.transparent = field.default === undefined
                    ? Compiler.#CUSTOM_OVERRIDE_PREFIX + field.index
                    : `${
                        Compiler.#fieldRuntime(transparent)
                    }.custom.call(this,${Compiler.#thisProp(transparent)})`;
            } else {
                plan.transparent = Compiler.#thisProp(transparent);
            }
        }

        return plan;
    }

    #print(plan: Plan): string {
        if (
            Object.keys(plan.tree).length === 0 &&
            plan.transparent === undefined
        ) {
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
            body += `if(${plan.transparency.join("&&")}){${
                Compiler.#transparentReturn(plan.transparent)
            }}`;
        }
        return body + `return ${Compiler.#RESULT_VAR};`;
    }

    #printAssigns(props: ObjectProps, path: string[] = []): string {
        let out = "";
        for (const [key, value] of Object.entries(props)) {
            if (typeof value === "string") {
                out += `{const v=${value};` +
                    `if(v!==undefined)${
                        this.#printAssignTarget([...path, key])
                    }=v;}`;
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
