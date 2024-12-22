import { getClassDeps } from './dep.js';
import { MeshBindingNotFound, MeshInvalidBinding } from './errors.js';
import { AbstractClass, Binding, Constructor, DepMetadata, Middleware, ServiceConstructor, ServiceKey } from './types.js';
import { keyToString } from './util.js';

export const MESH_REF = Symbol.for('MESH_REF');

/**
 * An IoC container.
 *
 * Encapsulates bindings — a map that allows to associate a _service key_ with a way to obtain an instance.
 *
 * Three binding types are supported via corresponding methods:
 *
 * - `service` — a zero-arg constructor mapping; these will be instantiated on demand and cached in a mesh instance
 * - `constant` — an instance of a class (can be bound by using class as service name) or an arbitrary value bound by a string key
 * - `alias` — a "redirect" mapping, resolves a key into another key from the same mesh; useful in tests
 */
export class Mesh {

    bindings = new Map<string, Binding<any>>();
    instances = new Map<string, any>();
    middlewares: Middleware[] = [];

    constructor(
        public name = 'default',
        public parent: Mesh | undefined = undefined,
    ) {
        this.constant(Mesh, this);
    }

    *[Symbol.iterator]() {
        yield* this.bindings.entries();
    }

    clone(): Mesh {
        const clone = new Mesh();
        clone.parent = this.parent;
        clone.bindings = new Map(this.bindings);
        return clone;
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

    alias<T>(key: AbstractClass<T> | string, referenceKey: AbstractClass<T> | string): this {
        const k = keyToString(key);
        const refK = keyToString(referenceKey);
        this.bindings.set(k, { type: 'alias', key: refK });
        return this;
    }

    delete<T>(key: ServiceKey<T>): this {
        const k = keyToString(key);
        this.bindings.delete(k);
        return this;
    }

    resolve<T>(key: ServiceKey<T>, recursive = true): T {
        const instance = this.tryResolve(key, recursive);
        if (instance === undefined) {
            const k = keyToString(key);
            throw new MeshBindingNotFound(this.name, k);
        }
        return instance;
    }

    tryResolve<T>(key: ServiceKey<T>, recursive = true): T | undefined {
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
        if (recursive && this.parent) {
            return this.parent.tryResolve(key);
        }
        return undefined;
    }

    getBinding<T>(key: ServiceKey<T>, recursive = true): Binding<T> | undefined {
        const k = keyToString(key);
        const binding = this.bindings.get(k);
        if (binding) {
            return binding;
        }
        if (recursive && this.parent) {
            return this.parent.getBinding(key);
        }
        return undefined;
    }

    *allBindings(): Iterable<[string, Binding<any>]> {
        yield* this.bindings.entries();
        if (this.parent) {
            yield* this.parent.allBindings();
        }
    }

    *missingDeps(): Iterable<DepMetadata> {
        for (const dep of this.allDeps()) {
            if (!this.getBinding(dep.key)) {
                yield dep;
            }
        }
    }

    *allDeps(): Iterable<DepMetadata> {
        const visitedKeys = new Set<string>();
        for (const [, binding] of this.allBindings()) {
            if (binding.type === 'service') {
                yield* this.traverseClassDeps(binding.class, visitedKeys);
            }
        }
    }

    *traverseClassDeps(ctor: Constructor<any>, visitedKeys = new Set<string>()): Iterable<DepMetadata> {
        const deps = getClassDeps(ctor);
        for (const dep of deps) {
            if (visitedKeys.has(dep.key)) {
                continue;
            }
            visitedKeys.add(dep.key);
            yield dep;
            const binding = this.getBinding(dep.key);
            if (binding?.type === 'service') {
                yield* this.traverseClassDeps(binding.class, visitedKeys);
            }
        }
    }

    instantiate<T>(binding: Binding<T>): T {
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
