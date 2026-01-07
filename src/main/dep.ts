import 'reflect-metadata';

import { DepInstanceNotConnected, DepKeyNotInferred } from './errors.js';
import { Mesh, MESH_REF } from './mesh.js';
import { DepMetadata, ServiceConstructor } from './types.js';

export const depMetadata: DepMetadata[] = [];

export interface DepOptions {
    key?: string;
    cache?: boolean;
    optional?: boolean;
}

export function dep(options: DepOptions = {}) {
    return function (target: any, propertyName: string) {
        const className = target.constructor.name;
        const designType = Reflect.getMetadata('design:type', target, propertyName);
        const {
            key = designType?.name,
            cache = true,
            optional = false,
        } = options;
        if (!key) {
            throw new DepKeyNotInferred(className, propertyName);
        }
        depMetadata.push({
            class: target.constructor,
            propertyName,
            key,
        });
        Object.defineProperty(target, propertyName, {
            configurable: true,
            get() {
                const mesh = this[MESH_REF] as Mesh;
                if (!mesh) {
                    throw new DepInstanceNotConnected(className, propertyName);
                }
                const value = optional ? mesh.tryResolve(key) : mesh.resolve(key);
                if (optional && value == null) {
                    return undefined;
                }
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

export function getClassDeps(ctor: ServiceConstructor<any>) {
    const result: DepMetadata[] = [];
    let proto = ctor;
    while (proto !== Object.prototype) {
        const deps = depMetadata.filter(_ => _.class === proto);
        result.push(...deps);
        proto = Object.getPrototypeOf(proto);
    }
    return result;
}
