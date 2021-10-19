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

export type ServiceKey<T> = ServiceConstructor<T> | AbstractService<T> | string;

export type Middleware = (instance: any) => any;
