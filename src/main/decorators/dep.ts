import 'reflect-metadata';

import { DepInstanceNotConnected, DepKeyNotInferred } from '../errors';
import { Mesh, MESH_REF } from '../mesh';
import { DepMetadata } from '../types';

export const depMetadata: DepMetadata[] = [];

export interface DepOptions {
    key?: string;
}

export function dep(options: DepOptions = {}) {
    return function (target: any, propertyName: string) {
        const className = target.constructor.name;
        const designType = Reflect.getMetadata('design:type', target, propertyName) as Function;
        const key = options.key ?? designType?.name;
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
            get() {
                const mesh = this[MESH_REF] as Mesh;
                if (!mesh) {
                    throw new DepInstanceNotConnected(className, propertyName);
                }
                return mesh.resolve(key);
            }
        });
    };
}
