/**
 * A collection that holds one value for each key.
 *
 * The collection gets the key from each value. It finds and removes values by their class, not by
 * their key.
 */
export class KeyedCollection<T extends object> {
    #inner = new Map<string, T>();
    #keyOf: (value: T) => string;

    protected constructor(keyOf: (value: T) => string, ...values: T[]) {
        this.#keyOf = keyOf;
        this.set(...values);
    }

    /** The number of values in the collection. */
    get size(): number {
        return this.#inner.size;
    }

    /** Adds values. A value replaces the value that has the same key. */
    set(...values: T[]): this {
        for (const value of values) {
            this.#inner.set(this.#keyOf(value), value);
        }
        return this;
    }

    /** Removes each value that is an instance of one of `constructors`. */
    delete(...constructors: (abstract new (...args: never[]) => T)[]): this {
        for (const [key, value] of this.#inner) {
            if (constructors.some((ctor) => value instanceof ctor)) {
                this.#inner.delete(key);
            }
        }
        return this;
    }

    /** Calls `callback` with this collection only if `condition` is true. */
    if(condition: boolean, callback: (collection: this) => void): this {
        if (condition) callback(this);
        return this;
    }

    /** Returns the first value that is an instance of `ctor`, or `undefined`. */
    get<U extends T>(ctor: abstract new (...args: never[]) => U): U | undefined {
        for (const value of this.#inner.values()) {
            if (value instanceof ctor) return value;
        }
        return undefined;
    }

    /** Returns `true` if the collection holds an instance of each class in `ctors`. */
    has(...ctors: (abstract new (...args: never[]) => T)[]): boolean {
        return ctors.every((ctor) => this.get(ctor) !== undefined);
    }

    /**
     * Iterates over the keys and values.
     *
     * @yields Each `[key, value]` pair, in the order that the keys were first added.
     */
    *[Symbol.iterator](): Generator<[string, T], void, unknown> {
        yield* this.#inner;
    }

    toJSON(): Record<string, T> {
        return Object.fromEntries(this.#inner);
    }
}
