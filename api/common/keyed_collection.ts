export class KeyedCollection<T extends object> {
    #inner = new Map<string, T>();
    #keyOf: (value: T) => string;

    protected constructor(keyOf: (value: T) => string, ...values: T[]) {
        this.#keyOf = keyOf;
        this.set(...values);
    }

    get size(): number {
        return this.#inner.size;
    }

    set(...values: T[]): this {
        for (const value of values) {
            this.#inner.set(this.#keyOf(value), value);
        }
        return this;
    }

    delete(
        ...constructors: (abstract new (...args: never[]) => T)[]
    ): this {
        for (const [key, value] of this.#inner) {
            if (constructors.some((ctor) => value instanceof ctor)) {
                this.#inner.delete(key);
            }
        }
        return this;
    }

    if(condition: boolean, callback: (collection: this) => void): this {
        if (condition) callback(this);
        return this;
    }

    get<U extends T>(
        ctor: abstract new (...args: never[]) => U,
    ): U | undefined {
        for (const value of this.#inner.values()) {
            if (value instanceof ctor) return value;
        }
    }

    has(...ctors: (abstract new (...args: never[]) => T)[]): boolean {
        return ctors.every((ctor) => this.get(ctor) !== undefined);
    }

    *[Symbol.iterator](): Generator<[string, T], void, unknown> {
        yield* this.#inner;
    }

    toJSON(): Record<string, T> {
        return Object.fromEntries(this.#inner);
    }
}
