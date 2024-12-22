export type Constructor<T> = new(...args: any[]) => T;

export type ServiceConstructor<T> = new() => T;

export interface AbstractClass<T> {
    name: string;
    prototype: T;
}

export type ServiceKey<T> = ServiceConstructor<T> | AbstractClass<T> | string;

export type Middleware = (instance: any) => any;

export type Binding<T> = ConstantBinding<T> | ServiceBinding<T> | AliasBinding;

export interface ConstantBinding<T> {
    type: 'constant';
    value: T;
}

export interface ServiceBinding<T> {
    type: 'service';
    class: ServiceConstructor<T>;
}

export interface AliasBinding {
    type: 'alias';
    key: string;
}

export interface DepMetadata {
    class: any;
    propertyName: string;
    key: string;
}
