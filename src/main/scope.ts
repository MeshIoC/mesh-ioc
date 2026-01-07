import 'reflect-metadata';

import { DepInstanceNotConnected } from './errors.js';
import { Mesh, MESH_REF } from './mesh.js';
import { ScopeConstructor } from './types.js';

export function scope<T extends Mesh>(serviceKey: ScopeConstructor<T> | string) {
    return function (target: any, propertyName: string) {
        const className = target.constructor.name;
        Object.defineProperty(target, propertyName, {
            get() {
                const mesh = this[MESH_REF];
                if (!mesh) {
                    throw new DepInstanceNotConnected(className, propertyName);
                }
                return mesh.resolve(serviceKey);
            },
        });
    };
}
