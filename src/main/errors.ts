class BaseError extends Error {
    name = this.constructor.name;
}

export class DepKeyNotInferred extends BaseError {
    constructor(public className: string, public propertyName: string) {
        super(`${className}.${propertyName}: ` +
            `@dep cannot infer the binding key (possibly due to circular dependency); ` +
            `please specify @dep({ key }) explicitly`);
    }
}

export class DepInstanceNotConnected extends BaseError {
    constructor(public className: string, public propertyName: string) {
        super(`${className}.${propertyName}: ` +
            `Cannot access @dep(): instance is not connected to Mesh`);
    }
}

export class MeshServiceNotFound extends BaseError {
    constructor(meshName: string, serviceKey: string) {
        super(`Service ${serviceKey} not found in Mesh ${meshName}`);
    }
}

export class MeshInvalidServiceBinding extends BaseError {
    constructor(key: string) {
        super(`Invalid service binding "${key}". Valid bindings are: ` +
            `string to constructor e.g. ('MyService', MyService) or ` +
            `abstract class to constructor e.g. (MyService, MyServiceImpl) or` +
            `constructor to self e.g. (MyService)`);
    }
}
