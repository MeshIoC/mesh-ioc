import assert from 'node:assert';

import { dep, Mesh, scope, ScopeProvider } from '../../main/index.js';

describe('@scope', () => {

    class MyScope extends Mesh {

            @dep({ key: 'Foo' }) foo!: number;

            constructor(parent: Mesh) {
                super('MyScope', parent);
                this.constant('Foo', 42);
            }

    }

    class SomeService {
            @scope(MyScope) myScope!: ScopeProvider<MyScope>;
    }

    it('injects scope provider', () => {
        const mesh = new Mesh();
        mesh.scope(MyScope);
        mesh.service(SomeService);
        const someService = mesh.resolve(SomeService);
        const scope = someService.myScope(mesh);
        assert.ok(scope instanceof MyScope);
        assert.strictEqual(scope.foo, 42);
    });

});
