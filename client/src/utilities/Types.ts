export type Diff<T, U> = T extends U ? never : T;
export type Remove<T, U> = { [K in Diff<keyof T, U> ]: T[K] };
export type Optional<T> = { [U in keyof T]?: T[U] };
export type FirstConstructorArgument<T> = T extends { new(props: infer U, ...params: never[]): any } ? U : never;
export type ConstructorInstance<T> = T extends { new(...params: never[]): infer U } ? U : never;