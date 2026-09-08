export type InstanceProps<T, Excluded extends PropertyKey = never> = {
    [
        K in keyof T as K extends Excluded ? never
            : T[K] extends (...args: never[]) => unknown ? never
            : K
    ]: T[K];
};
