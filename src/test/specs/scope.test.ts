import assert from 'node:assert';

import { Mesh, scope, ScopeProvider } from '../../main/index.js';

describe('@scope', () => {

    class MyScope extends Mesh {
        constructor(parent?: Mesh) {
            super('MyScope', parent);
            this.constant('Foo', 42);
        }
    }

    class SomeService {
        @scope(MyScope) myScope!: ScopeProvider;

        foo() {
            const scope = this.myScope();
            return scope.resolve('Foo');
        }
    }

    it('injects scope when provided as constructor', () => {
        const mesh = new Mesh();
        mesh.scope(MyScope);
        mesh.service(SomeService);
        const someService = mesh.resolve(SomeService);
        const scope = someService.myScope(mesh);
        assert.ok(scope instanceof MyScope);
        assert.strictEqual(someService.foo(), 42);
    });

    it('injects scope when provided as factory function', () => {
        const mesh = new Mesh();
        mesh.service(SomeService);
        mesh.scope('MyScope', () => {
            const mesh = new Mesh();
            mesh.constant('Foo', 123);
            return mesh;
        });
        const someService = mesh.resolve(SomeService);
        assert.strictEqual(someService.foo(), 123);
    });

});
