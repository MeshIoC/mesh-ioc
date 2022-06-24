import { Mesh } from './mesh.js';
import { ServiceHandler } from './types.js';

export const handlersMap = new Map<string, ServiceHandler[]>();

export function createHandlerDecorator(name: string) {
    const handlers = handlersMap.get(name) ?? [];
    handlersMap.set(name, handlers);
    return () => {
        return (target: any, methodName: string) => {
            handlers.push({
                target: target.constructor,
                methodName,
            });
        };
    };
}

export function* findHandlers(mesh: Mesh, name: string, recursive = true): IterableIterator<ServiceHandler> {
    const targets = handlersMap.get(name) ?? [];
    for (const [key, binding] of mesh.bindings) {
        if (binding.type === 'service') {
            for (const t of targets) {
                if (t.target === binding.class || t.target.isPrototypeOf(binding.class)) {
                    yield {
                        target: mesh.resolve(key),
                        methodName: t.methodName,
                    };
                }
            }
        }
    }
    if (recursive && mesh.parent) {
        yield* findHandlers(mesh.parent, name, recursive);
    }
}

export async function invokeHandlers(mesh: Mesh, name: string, recursive = false) {
    const handlers = [...findHandlers(mesh, name, recursive)];
    const promises = handlers.map(h => h.target[h.methodName]());
    await Promise.all(promises);
}
