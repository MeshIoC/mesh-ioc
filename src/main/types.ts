import { Mesh } from './mesh.js';

export interface AbstractClass<T> {
    name: string;
    prototype: T;
}

export type Constructor<T> = new (...args: any[]) => T;

export type Factory<T> = (...args: any[]) => T;

export type ServiceConstructor<T> = new () => T;

export type ServiceKey<T> = ServiceConstructor<T> | AbstractClass<T> | string;

export type ScopeConstructor<T extends Mesh = Mesh> = new (mesh: Mesh) => T;

export type ScopeFactory<T extends Mesh = Mesh> = (mesh: Mesh) => T;

export type ScopeProvider<T extends Mesh = Mesh> = (mesh?: Mesh) => T;

export type Middleware = (instance: any) => any;

export type Binding<T> = ConstantBinding<T> | ServiceBinding<T> | AliasBinding | ScopeBinding;

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

export interface ScopeBinding {
    type: 'scope';
    factory: ScopeConstructor<any> | ScopeFactory<any>;
}

export interface DepMetadata {
    class: any;
    propertyName: string;
    key: string;
}
