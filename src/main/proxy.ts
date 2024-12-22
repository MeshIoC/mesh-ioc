import { Mesh, MESH_REF } from './mesh.js';
import { ServiceKey } from './types.js';

const PROXY_TRAPS = Object.getOwnPropertyNames(Reflect) as Array<keyof ProxyHandler<any>>;

export type ServiceProxy<T> = T;

export function dependency<T>(thisArg: any, serviceKey: ServiceKey<T>, cache = true): T {
    let cachedInstance: T | undefined;
    const handler: ProxyHandler<any> = {};
    for (const trap of PROXY_TRAPS) {
        handler[trap] = function (_target: any, ...args: any[]) {
            let instance = cachedInstance;
            if (!instance) {
                instance = (thisArg[MESH_REF] as Mesh).resolve(serviceKey);
            }
            if (cache) {
                cachedInstance = instance;
            }
            return (Reflect as any)[trap](instance, ...args);
        };
    }

    return new Proxy(thisArg, handler);
}
