type IfEquals<X, Y, A, B> =
    // oxlint-disable-next-line typescript/no-unnecessary-type-parameters
    (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

type WritableKeys<T> = {
    [K in keyof T]-?: IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never>;
}[keyof T];

/**
 * The writable data fields of `T`.
 *
 * The type leaves out methods, readonly fields, getters without setters, and the keys in
 * `Excluded`.
 */
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
