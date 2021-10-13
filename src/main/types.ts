export type Constructor<T> = {
    new(...args: any[]): T;
}

export type ServiceConstructor<T> = {
    new(): T;
}

export type AbstractService<T> = {
    name: string;
    prototype: T;
}
