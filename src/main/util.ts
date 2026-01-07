import { Constructor, Factory, ServiceConstructor, ServiceKey } from './types.js';

export function keyToString<T>(key: ServiceKey<T>) {
    return typeof key === 'string' ? key : key.name;
}

export function isConstructor(v: unknown): v is ServiceConstructor<any> {
    return typeof v === 'function' && v.prototype != null;
}

export function instantiate<T>(constructorOrFactory: Constructor<T> | Factory<T>, ...args: any[]): T {
    if (isConstructor(constructorOrFactory)) {
        return new constructorOrFactory(...args);
    }
    return constructorOrFactory(...args);
}
