import { ServiceMetadata } from '../types';

export const svcMetadata: ServiceMetadata[] = [];

export interface SvcOptions {
    alias?: string;
    metadata?: any;
}

export function service(options: SvcOptions = {}) {
    return function(target: any) {
        svcMetadata.push({
            class: target,
            ...options,
        });
    };
}
