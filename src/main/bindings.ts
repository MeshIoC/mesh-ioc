import { ServiceConstructor } from './types';

export type Binding<T> = ConstantBinding<T> | ServiceBinding<T> | AliasBinding;

export type ConstantBinding<T> = {
    type: 'constant';
    value: T;
};

export type ServiceBinding<T> = {
    type: 'service';
    class: ServiceConstructor<T>;
};

export type AliasBinding = {
    type: 'alias';
    key: string;
}
