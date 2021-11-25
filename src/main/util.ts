import { ServiceKey } from './types';

export function keyToString<T>(key: ServiceKey<T>) {
    return typeof key === 'string' ? key : key.name;
}
