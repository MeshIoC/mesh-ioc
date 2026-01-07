import assert from 'assert';

import { dep } from '../../main/dep.js';
import { Mesh } from '../../main/mesh.js';

describe('@dep', () => {

    describe('use @dep in constructor', () => {

        class Counter {
            value = 0;
            incr() {
                this.value += 1;
            }
        }

        class Foo {
            @dep() counter!: Counter;
            constructor() {
                this.counter.incr();
            }
        }

        it('allows accessing @dep in constructor', () => {
            const mesh = new Mesh();
            mesh.service(Counter);
            mesh.service(Foo);
            const counter = mesh.resolve(Counter);
            const foo = mesh.resolve(Foo);
            assert.strictEqual(counter.value, 1);
            assert.strictEqual(counter.constructor.name, 'Counter');
            assert.strictEqual(foo.counter.value, 1);
        });
    });

    describe('inject classes', () => {

        class Session {
            constructor(readonly sessionId: number) {}
        }

        class OtherSession extends Session {}

        class SessionManager {
            @dep({ key: 'Session' }) Session!: typeof Session;

            createSession(id: number): Session {
                return new this.Session(id);
            }
        }

        it('allows binding classes', () => {
            const mesh = new Mesh();
            mesh.constant('Session', OtherSession);
            mesh.service(SessionManager);
            const SessionClass = mesh.resolve('Session');
            assert.strictEqual(SessionClass, OtherSession);
            const mgr = mesh.resolve(SessionManager);
            const sess = mgr.createSession(42);
            assert.ok(sess instanceof OtherSession);
        });

    });

    describe('optional deps', () => {

        class Bar {}
        class Foo {
            @dep({ optional: true }) opt!: Bar;
            @dep() req!: Bar;
        }

        it('resolves optional deps when provided', () => {
            const mesh = new Mesh();
            mesh.service(Bar);
            mesh.service(Foo);
            const foo = mesh.resolve(Foo);
            assert.ok(foo.opt instanceof Bar);
            assert.ok(foo.req instanceof Bar);
        });

        it('resolves optional dep as undefined when not provided', () => {
            const mesh = new Mesh();
            mesh.service(Foo);
            const foo = mesh.resolve(Foo);
            assert.strictEqual(foo.opt, undefined);
        });

        it('throws when required dep is not provided', () => {
            const mesh = new Mesh();
            mesh.service(Foo);
            try {
                const foo = mesh.resolve(Foo);
                (() => foo.req)();
                throw new Error('UnexpectedSuccess');
            } catch (err: any) {
                assert.strictEqual(err.name, 'MeshBindingNotFound');
            }
        });

    });

});
