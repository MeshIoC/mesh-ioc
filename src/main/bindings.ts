import { Mesh } from './mesh';
import { ServiceConstructor } from './types';

export abstract class Binding<T> {
    constructor(readonly mesh: Mesh, readonly key: string) {}
    abstract get(): T;
}

export class ConstantBinding<T> extends Binding<T> {
    value: T;

    constructor(mesh: Mesh, key: string, value: T) {
        super(mesh, key);
        this.value = this.mesh.applyMiddleware(value);
        this.mesh.connect(this.value);
    }

    get() {
        return this.value;
    }
}

export class ServiceBinding<T> extends Binding<T> {
    instance: T | undefined;

    constructor(mesh: Mesh, key: string, readonly ctor: ServiceConstructor<T>) {
        super(mesh, key);
    }

    get(): T {
        if (!this.instance) {
            this.instance = this.mesh.applyMiddleware(new this.ctor());
            this.mesh.connect(this.instance);
        }
        return this.instance;
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
