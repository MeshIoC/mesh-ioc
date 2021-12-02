import { MeshInvalidBinding } from './errors';
import { AbstractClass, Binding, ServiceConstructor, ServiceKey } from './types';
import { keyToString } from './util';

export class Scope {
    bindings = new Map<string, Binding<any>>();

    constructor(
        readonly name: string,
        bindings: Iterable<[string, Binding<any>]> = [],
    ) {
        for (const [k, v] of bindings) {
            this.bindings.set(k, v);
        }
    }

    *[Symbol.iterator]() {
        yield* this.bindings.entries();
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

}
