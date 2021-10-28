import { Mesh } from './mesh';
import { Constructor, ServiceConstructor } from './types';

export abstract class Binding<T> {
    constructor(readonly mesh: Mesh, readonly key: string) {}
    abstract get(): T;
}

export class ConstantBinding<T> extends Binding<T> {
    value: T;

    constructor(mesh: Mesh, key: string, value: T) {
        super(mesh, key);
        this.value = this.mesh.connect(value);
    }

    get() {
        return this.value;
    }
}

export class ServiceBinding<T> extends Binding<T> {
    ctor: ServiceConstructor<T>;
    instance: T | undefined;

    constructor(mesh: Mesh, key: string, ctor: ServiceConstructor<T>) {
        super(mesh, key);
        this.ctor = this.processClass(ctor);
    }

    get(): T {
        if (!this.instance) {
            const inst = new this.ctor();
            this.instance = this.mesh.connect(inst);
        }
        return this.instance;
    }

    protected processClass(ctor: any) {
        // A fake derived class is created with Mesh attached to its prototype.
        // This allows accessing deps in constructor whilst preserving instanceof.
        const derived = class extends ctor {};
        Object.defineProperty(derived, 'name', { value: ctor.name });
        this.mesh.injectRef(derived.prototype);
        return derived;
    }
}

export class ClassBinding<T extends Constructor<T>> extends Binding<T> {

    constructor(mesh: Mesh, key: string, readonly ctor: T) {
        super(mesh, key);
    }

    get(): T {
        return this.ctor;
    }
}

export class ProxyBinding<T> extends Binding<T> {

    constructor(mesh: Mesh, key: string, readonly alias: string) {
        super(mesh, key);
    }

    get(): T {
        return this.mesh.resolve(this.alias);
    }
}
