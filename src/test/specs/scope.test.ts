import assert from 'assert';

import { dep, Mesh } from '../../main';

describe('Scopes', () => {

    class SharedService {}

    class ScopedService {
        @dep({ key: 'SessionId' }) sessionId!: string;
        @dep() shared!: SharedService;
    }

    class AnotherScopedService {
        @dep({ key: 'SessionId' }) sessionId!: string;
        @dep() scopedService!: ScopedService;
    }

    const mesh = new Mesh();
    mesh.service(SharedService);
    mesh.scope('session')
        .service(ScopedService)
        .service(AnotherScopedService);

    it('creates a scoped mesh', () => {
        const requestScope = mesh.createScope('session');
        requestScope.constant('SessionId', '42');
        const scopedService = requestScope.resolve(ScopedService);
        assert.ok(scopedService instanceof ScopedService);
        assert.strictEqual(scopedService.sessionId, '42');
    });

    it('dependencies of the same scope are equal', () => {
        const requestScope = mesh.createScope('session');
        requestScope.constant('SessionId', '42');
        const scopedService = requestScope.resolve(ScopedService);
        const anotherService = requestScope.resolve(AnotherScopedService);
        assert.ok(scopedService === anotherService.scopedService);
    });

    it('scoped services in different scopes are not equal', () => {
        const reqA = mesh.createScope('session')
            .constant('SessionId', 'A');
        const reqB = mesh.createScope('session')
            .constant('SessionId', 'B');
        const serviceA = reqA.resolve(ScopedService);
        const serviceB = reqB.resolve(ScopedService);
        assert.ok(serviceA !== serviceB);
        assert.strictEqual(serviceA.sessionId, 'A');
        assert.strictEqual(serviceB.sessionId, 'B');
    });

    it('shared services are still equal across scopes', () => {
        const reqA = mesh.createScope('session')
            .constant('SessionId', 'A');
        const reqB = mesh.createScope('session')
            .constant('SessionId', 'B');
        const sharedServiceA = reqA.resolve(SharedService);
        const sharedServiceB = reqB.resolve(SharedService);
        assert.ok(sharedServiceA === sharedServiceB);
    });

});
