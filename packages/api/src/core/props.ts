/** Whether `X` and `Y` are identical types, including `readonly` modifiers. */
type IfEquals<X, Y, A, B> =
    // oxlint-disable-next-line typescript/no-unnecessary-type-parameters
    (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

/** Keys of `T` that aren't `readonly`. Getter-only accessors count as `readonly`. */
type WritableKeys<T> = {
    [K in keyof T]-?: IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never>;
}[keyof T];

/** `T`'s assignable data fields, minus methods, getter-only accessors and `Excluded`. */
export type InstanceProps<T, Excluded extends PropertyKey = never> = {
    [
        K in keyof T as K extends Excluded
            ? never
            : K extends WritableKeys<T>
              ? T[K] extends (...args: never[]) => unknown
                  ? never
                  : K
              : never
    ]: T[K];
};

/** Any abstract or concrete constructor of `T`. */
// oxlint-disable-next-line typescript/no-explicit-any
export type Ctor<T> = abstract new (...args: any[]) => T;
