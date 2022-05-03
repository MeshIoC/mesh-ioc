import { MeshBindingNotFound, MeshInvalidBinding } from './errors';
import { AbstractClass, Binding, Middleware, ServiceConstructor, ServiceKey } from './types';
import { keyToString } from './util';

export const MESH_REF = Symbol.for('MESH_REF');

/**
 * An IoC container.
 *
 * Encapsulates bindings — a map that allows to associate a _service key_ with a way to obtain an instance.
 *
 * Three binding types are supported via corresponding methods:
 *
 * - `service` — a zero-arg constructor mapping; these will be instantiated on demand and cached in this mesh
 * - `constant` — an instance of a class (can be bound by using class as service name) or an arbitrary value bound by a string key
 * - `alias` — a "redirect" mapping, useful in tests
 */
export class Mesh {
    bindings = new Map<string, Binding<any>>();
    instances = new Map<string, any>();
    middlewares: Middleware[] = [];

    constructor(
        public name: string = 'default',
        public parent: Mesh | undefined = undefined,
    ) {}

    *[Symbol.iterator]() {
        yield* this.bindings.entries();
    }

    clone(): Mesh {
        const clone = new Mesh();
        clone.parent = this.parent;
        clone.bindings = new Map(this.bindings);
        return clone;
    }

    service<T>(impl: ServiceConstructor<T>): this;
    service<T>(key: AbstractClass<T> | string, impl: ServiceConstructor<T>): this;
    service<T>(key: ServiceConstructor<T> | AbstractClass<T> | string, impl?: ServiceConstructor<T>): this {
        const k = keyToString(key);
        if (typeof impl === 'function') {
            this.bindings.set(k, { type: 'service', class: impl });
            return this;
        } else if (typeof key === 'function') {
            this.bindings.set(k, { type: 'service', class: key });
            return this;
        }
        throw new MeshInvalidBinding(String(key));
    }

    constant<T>(key: ServiceKey<T>, value: T): this {
        const k = keyToString(key);
        this.bindings.set(k, { type: 'constant', value });
        return this;
    }

    alias<T>(key: AbstractClass<T> | string, referenceKey: AbstractClass<T> | string) {
        const k = keyToString(key);
        const refK = keyToString(referenceKey);
        this.bindings.set(k, { type: 'alias', key: refK });
        return this;
    }

    resolve<T>(key: ServiceKey<T>): T {
        const instance = this.tryResolve(key);
        if (instance === undefined) {
            const k = keyToString(key);
            throw new MeshBindingNotFound(this.name, k);
        }
        return instance;
    }

    tryResolve<T>(key: ServiceKey<T>): T | undefined {
        const k = keyToString(key);
        let instance = this.instances.get(k);
        if (instance) {
            return instance;
        }
        const binding = this.bindings.get(k);
        if (binding) {
            instance = this.instantiate(binding);
            instance = this.connect(instance);
            this.instances.set(k, instance);
            return instance;
        }
        if (this.parent) {
            return this.parent.tryResolve(key);
        }
        return undefined;
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

    protected instantiate<T>(binding: Binding<T>): T {
        switch (binding.type) {
            case 'alias':
                return this.resolve(binding.key);
            case 'service': {
                // A fake derived class is created with Mesh attached to its prototype.
                // This allows accessing deps in constructor whilst preserving instanceof.
                const ctor = binding.class as any;
                const derived = class extends ctor {};
                Object.defineProperty(derived, 'name', { value: ctor.name });
                this.injectRef(derived.prototype);
                return new derived();
            }
            case 'constant':
                return binding.value;
        }
    }

    protected applyMiddleware<T>(value: T): T {
        let res = value;
        for (const middleware of this.middlewares) {
            res = middleware(res);
        }
        if (this.parent) {
            res = this.parent.applyMiddleware(res);
        }
        return res;
    }

    protected injectRef(value: any) {
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
