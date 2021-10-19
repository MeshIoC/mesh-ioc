import { Binding, ConstantBinding, ProxyBinding, ServiceBinding } from './bindings';
import { MeshInvalidServiceBinding, MeshServiceNotFound } from './errors';
import { AbstractService, ServiceConstructor } from './types';

export const MESH_REF = Symbol.for('MESH_REF');

export type ServiceKey<T> = ServiceConstructor<T> | AbstractService<T> | string;

export class Mesh {
    bindings: Map<string, Binding<any>> = new Map();

    constructor(
        public name: string = 'default',
        public parent: Mesh | undefined = undefined,
    ) {
        this.constant('Mesh', this);
    }

    bind<T>(impl: ServiceConstructor<T>): Binding<T>;
    bind<T>(key: AbstractService<T> | string, impl: ServiceConstructor<T>): Binding<T>;
    bind<T>(key: ServiceConstructor<T> | AbstractService<T> | string, impl?: ServiceConstructor<T>): Binding<T> {
        const k = keyToString(key);
        if (typeof impl === 'function') {
            return this._bindService(k, impl);
        } else if (typeof key === 'function') {
            return this._bindService(k, key);
        }
        throw new MeshInvalidServiceBinding(String(key));
    }

    constant<T>(key: ServiceKey<T>, value: T): Binding<T> {
        const k = keyToString(key);
        return this._add(new ConstantBinding<T>(this, k, value));
    }

    alias<T>(key: AbstractService<T> | string, referenceKey: AbstractService<T> | string): Binding<T> {
        const k = keyToString(key);
        const refK = typeof referenceKey === 'string' ? referenceKey : referenceKey.name;
        return this._add(new ProxyBinding(this, k, refK));
    }

    resolve<T>(key: ServiceKey<T>): T {
        const k = keyToString(key);
        const binding = this.bindings.get(k);
        if (binding) {
            return binding.get();
        }
        if (this.parent) {
            return this.parent.resolve(key);
        }
        throw new MeshServiceNotFound(this.name, k);
    }

    connect(value: any) {
        // TODO apply middlewares
        this._addMeshRef(value);
    }

    protected _bindService<T>(key: string, impl: ServiceConstructor<T>): Binding<T> {
        return this._add(new ServiceBinding<T>(this, key, impl));
    }

    protected _add<T>(binding: Binding<any>): Binding<T> {
        this.bindings.set(binding.key, binding);
        return new ProxyBinding<T>(this, binding.key, binding.key);
    }

    protected _addMeshRef(value: any) {
        if (typeof value !== 'object') {
            return;
        }
        Object.defineProperty(value, MESH_REF, {
            get: () => this,
            enumerable: false,
            configurable: true,
        });
    }

}

function keyToString<T>(key: ServiceKey<T>) {
    return typeof key === 'string' ? key : key.name;
}
