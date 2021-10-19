import { Binding, ConstantBinding, ProxyBinding, ServiceBinding } from './bindings';
import { MeshInvalidServiceBinding, MeshServiceNotFound } from './errors';
import { AbstractService, Middleware, ServiceConstructor, ServiceKey } from './types';

export const MESH_REF = Symbol.for('MESH_REF');

export class Mesh {
    bindings: Map<string, Binding<any>> = new Map();
    middlewares: Middleware[] = [];

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

    protected _bindService<T>(k: string, impl: ServiceConstructor<T>): Binding<T> {
        const binding = new ServiceBinding<T>(this, k, impl);
        this.bindings.set(k, binding);
        return new ProxyBinding<T>(this, k, k);
    }

    constant<T>(key: ServiceKey<T>, value: T): Binding<T> {
        const k = keyToString(key);
        const binding = new ConstantBinding<T>(this, k, value);
        this.bindings.set(k, binding);
        return new ProxyBinding<T>(this, k, k);
    }

    alias<T>(key: AbstractService<T> | string, referenceKey: AbstractService<T> | string): Binding<T> {
        const k = keyToString(key);
        const refK = typeof referenceKey === 'string' ? referenceKey : referenceKey.name;
        const binding = new ProxyBinding<T>(this, k, refK);
        this.bindings.set(k, binding);
        return binding;
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

    connect<T>(value: T): T {
        const res = this.applyMiddleware(value);
        this.addMeshRef(res);
        return res;
    }

    use(fn: Middleware): this {
        this.middlewares.push(fn);
        return this;
    }

    protected applyMiddleware<T>(value: T): T {
        let res = value;
        for (const middleware of this.middlewares) {
            res = middleware(res);
        }
        return res;
    }

    protected addMeshRef(value: any) {
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
