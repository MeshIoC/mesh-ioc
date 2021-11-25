import { Binding } from './bindings';
import { MeshBindingNotFound } from './errors';
import { Scope } from './scope';
import { AbstractClass, Middleware, ServiceConstructor, ServiceKey } from './types';
import { keyToString } from './util';

export const MESH_REF = Symbol.for('MESH_REF');

export class Mesh {
    currentScope: Scope;
    childScopes = new Map<string, Scope>();
    instances = new Map<string, any>();
    middlewares: Middleware[] = [];

    constructor(
        public name: string = 'default',
        public parent: Mesh | undefined = undefined,
    ) {
        this.currentScope = new Scope(name);
        this.currentScope.constant('Mesh', this);
    }

    service<T>(impl: ServiceConstructor<T>): this;
    service<T>(key: AbstractClass<T> | string, impl: ServiceConstructor<T>): this;
    service<T>(key: ServiceConstructor<T> | AbstractClass<T> | string, impl?: ServiceConstructor<T>): this {
        (this.currentScope.service as any)(key, impl);
        return this;
    }

    constant<T>(key: ServiceKey<T>, value: T): this {
        this.currentScope.constant(key, value);
        return this;
    }

    alias<T>(key: AbstractClass<T> | string, referenceKey: AbstractClass<T> | string): this {
        this.currentScope.alias(key, referenceKey);
        return this;
    }

    resolve<T>(key: ServiceKey<T>): T {
        const k = keyToString(key);
        let instance = this.instances.get(k);
        if (instance) {
            return instance;
        }
        const binding = this.currentScope.bindings.get(k);
        if (binding) {
            instance = this.instantiate(binding);
            instance = this.connect(instance);
            this.instances.set(k, instance);
            return instance;
        }
        if (this.parent) {
            return this.parent.resolve(key);
        }
        throw new MeshBindingNotFound(this.name, k);
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

    scope(scopeId: string): Scope {
        let scope = this.childScopes.get(scopeId);
        if (!scope) {
            scope = new Scope(scopeId);
            this.childScopes.set(scopeId, scope);
        }
        return scope;
    }

    createScope(scopeId: string, scopeName: string = scopeId): Mesh {
        const childScope = this.childScopes.get(scopeId);
        const newScope = new Scope(scopeName, childScope ?? []);
        const mesh = new Mesh(scopeId, this);
        mesh.currentScope = newScope;
        return mesh;
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
