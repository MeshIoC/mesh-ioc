import assert from 'assert';

import { Mesh } from '../../main/mesh.js';
import { dependency } from '../../main/proxy.js';

describe('proxy-based injection', () => {

    class A {
        greet(name: string) {
            return `Hello, ${name}!`;
        }
    }

    class B {
        foo() {
            return 42;
        }
    }

    class C {
        b = dependency(this, B);
    }

    class CEx extends C {
        a = dependency(this, A);
    }

    class D {
        a = dependency(this, A);
        greeting: string;

        constructor() {
            this.greeting = this.a.greet('Joe');
        }

    }

    it('resolves dependencies', () => {
        const mesh = new Mesh();
        mesh.service(A);
        mesh.service(B);
        mesh.service(C);
        mesh.service(CEx);

        const cex = mesh.resolve(CEx);
        assert.equal(cex.b.foo(), 42);
        assert.equal(cex.a.greet('Joe'), 'Hello, Joe!');

        assert.ok(cex.a instanceof A);
    });

    it('resolves dependencies in constructor', () => {
        const mesh = new Mesh();
        mesh.service(A);
        mesh.service(D);
        const d = mesh.resolve(D);
        assert.equal(d.greeting, 'Hello, Joe!');
    });

});
