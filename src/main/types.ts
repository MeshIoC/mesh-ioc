export type Constructor<T> = {
    new(...args: any[]): T;
}

export type ServiceConstructor<T> = {
    new(): T;
}

export type AbstractClass<T> = {
    name: string;
    prototype: T;
}

export type ServiceKey<T> = ServiceConstructor<T> | AbstractClass<T> | string;

export type Middleware = (instance: any) => any;

export type Binding<T> = ConstantBinding<T> | ServiceBinding<T> | AliasBinding;

export type ConstantBinding<T> = {
    type: 'constant';
    value: T;
};

export type ServiceBinding<T> = {
    type: 'service';
    class: ServiceConstructor<T>;
};

export type AliasBinding = {
    type: 'alias';
    key: string;
}

export interface DepMetadata {
    className: string;
    propertyName: string;
    designTypeName: string;
    key: string;
}
