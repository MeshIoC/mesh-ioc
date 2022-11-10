import 'reflect-metadata';

import { DepInstanceNotConnected, DepKeyNotInferred } from '../errors.js';
import { Mesh, MESH_REF } from '../mesh.js';
import { DepMetadata } from '../types.js';

export const depMetadata: DepMetadata[] = [];

export interface DepOptions {
    key?: string;
    cache?: boolean;
}

export function dep(options: DepOptions = {}) {
    return function (target: any, propertyName: string) {
        const className = target.constructor.name;
        const designType = Reflect.getMetadata('design:type', target, propertyName) as Function;
        const key = options.key ?? designType?.name;
        const cache = options.cache ?? true;
        if (!key) {
            throw new DepKeyNotInferred(className, propertyName);
        }
        depMetadata.push({
            class: target.constructor,
            propertyName,
            designTypeName: designType.name,
            key,
        });
        Object.defineProperty(target, propertyName, {
            configurable: true,
            get() {
                const mesh = this[MESH_REF] as Mesh;
                if (!mesh) {
                    throw new DepInstanceNotConnected(className, propertyName);
                }
                const value = mesh.resolve(key);
                if (cache) {
                    Object.defineProperty(this, propertyName, {
                        configurable: true,
                        value
                    });
                }
                return value;
            },
        });
    };
}
