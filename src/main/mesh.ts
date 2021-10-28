import { ClassBinding } from '.';
import { Binding, ConstantBinding, ProxyBinding, ServiceBinding } from './bindings';
import { MeshInvalidBinding, MeshServiceNotFound } from './errors';
import { AbstractClass, Constructor, Middleware, ServiceConstructor, ServiceKey } from './types';

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
    bind<T>(key: AbstractClass<T> | string, impl: ServiceConstructor<T>): Binding<T>;
    bind<T>(key: ServiceConstructor<T> | AbstractClass<T> | string, impl?: ServiceConstructor<T>): Binding<T> {
        const k = keyToString(key);
        if (typeof impl === 'function') {
            return this._bindService(k, impl);
        } else if (typeof key === 'function') {
            return this._bindService(k, key);
        }
        throw new MeshInvalidBinding(String(key));
    }

    protected _bindService<T>(k: string, impl: ServiceConstructor<T>): Binding<T> {
        const binding = new ServiceBinding<T>(this, k, impl);
        this.bindings.set(k, binding);
        return new ProxyBinding<T>(this, k, k);
    }

    class<T extends Constructor<any>>(ctor: T): ClassBinding<T>;
    class<T extends Constructor<any>>(key: AbstractClass<T> | string, ctor: T): Binding<T>;
    class<T extends Constructor<any>>(key: T | AbstractClass<T> | string, ctor?: T) {
        const k = keyToString(key);
        if (typeof ctor === 'function') {
            return this._bindClass(k, ctor);
        } else if (typeof key === 'function') {
            return this._bindClass(k, key);
        }
        throw new MeshInvalidBinding(String(key));
    }

    protected _bindClass<T extends Constructor<any>>(k: string, ctor: T): ClassBinding<T> {
        const binding = new ClassBinding(this, k, ctor);
        this.bindings.set(k, binding);
        return binding;
    }

    constant<T>(key: ServiceKey<T>, value: T): Binding<T> {
        const k = keyToString(key);
        const binding = new ConstantBinding<T>(this, k, value);
        this.bindings.set(k, binding);
        return new ProxyBinding<T>(this, k, k);
    }

    alias<T>(key: AbstractClass<T> | string, referenceKey: AbstractClass<T> | string): Binding<T> {
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
        this.injectRef(res);
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

    injectRef(value: any) {
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
