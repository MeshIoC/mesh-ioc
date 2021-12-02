import { ServiceMetadata } from '../types';

export const serviceMetadata: ServiceMetadata[] = [];

export interface SvcOptions {
    alias?: string;
    metadata?: any;
}

export function service(options: SvcOptions = {}) {
    return function(target: any) {
        serviceMetadata.push({
            class: target,
            ...options,
        });
    };
}
