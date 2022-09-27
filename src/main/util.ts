import { ServiceKey } from './types.js';

export function keyToString<T>(key: ServiceKey<T>) {
    return typeof key === 'string' ? key : key.name;
}
