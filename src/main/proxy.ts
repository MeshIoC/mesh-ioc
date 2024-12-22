import { Mesh, MESH_REF } from './mesh.js';
import { ServiceKey } from './types.js';

export type ServiceProxy<T> = T;

export function dependency<T>(thisArg: any, serviceKey: ServiceKey<T>): T {
    const handler = new Proxy({} as ProxyHandler<any>, {
        get(_target, trap) {
            return function (_target: any, ...args: any[]) {
                const instance = (thisArg[MESH_REF] as Mesh).resolve(serviceKey);
                return (Reflect as any)[trap](instance, ...args);
            };
        }
    });
    return new Proxy(thisArg, handler);
}
