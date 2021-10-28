import assert from 'assert';

import { dep } from '../../main';
import { Mesh } from '../../main/mesh';
import { Database } from '../services/database';
import { Logger, StandardLogger, TestLogger } from '../services/logger';

describe('Mesh', () => {

    describe('bindings', () => {

        it('creates an instance of bound service', () => {
            const mesh = new Mesh();
            const refLogger = mesh.bind(Logger, StandardLogger);
            const logger = refLogger.get();
            assert.ok(logger instanceof StandardLogger);
        });

        it('caches the instance, so the same instance is returned', () => {
            const mesh = new Mesh();
            const refLogger = mesh.bind(Logger, StandardLogger);
            const logger1 = refLogger.get();
            const logger2 = refLogger.get();
            assert.ok(logger1 === logger2);
        });

        it('returns another instance if binding has changed', () => {
            const mesh = new Mesh();
            const refLogger = mesh.bind(Logger, StandardLogger);
            const logger1 = refLogger.get();
            mesh.bind(Logger, TestLogger);
            const logger2 = refLogger.get();
            assert.ok(logger1 !== logger2);
            assert.ok(logger2 instanceof TestLogger);
        });
    });

    describe('resolve', () => {
        it('resolves binding by class name', () => {
            const mesh = new Mesh();
            mesh.bind(Logger, StandardLogger);
            const logger = mesh.resolve<Logger>('Logger');
            assert.ok(logger instanceof StandardLogger);
        });
    });

    describe('dependency resolution', () => {
        it('resolves dependency decorated with @dep', () => {
            const mesh = new Mesh();
            const _testLogger = mesh.bind(TestLogger);
            mesh.alias(Logger, TestLogger);
            const _db = mesh.bind(Database);
            const db = _db.get();
            assert.ok(db.logger instanceof TestLogger);
            db.connect();
            assert.deepStrictEqual(_testLogger.get().messages, ['Connected to database']);
        });
    });

    describe('connect', () => {
        it('allows connecting "guest" instances so they can use @dep', () => {
            const mesh = new Mesh();
            mesh.bind(Logger, TestLogger);
            class Foo {
                @dep() logger!: Logger;
            }
            const foo = new Foo();
            mesh.connect(foo);
            assert.ok(foo.logger instanceof TestLogger);
        });
    });

    describe('middleware', () => {
        it('applies middleware to bound instances', () => {
            const mesh = new Mesh();
            mesh.bind(Logger, TestLogger);
            mesh.use(obj => {
                Object.defineProperty(obj, 'foo', {
                    value: 42
                });
                return obj;
            });
            mesh.use(obj => {
                Object.defineProperty(obj, 'bar', {
                    value: 24
                });
                return obj;
            });
            const logger = mesh.resolve(Logger);
            assert.strictEqual((logger as any).foo, 42);
            assert.strictEqual((logger as any).bar, 24);
        });
    });

    describe('use deps in constructor', () => {

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
            const counter = mesh.bind(Counter);
            const foo = mesh.bind(Foo);
            foo.get();
            assert.strictEqual(counter.get().value, 1);
            assert.strictEqual(counter.get().constructor.name, 'Counter');
        });
    });

    describe('inject classes', () => {
        class Session {
            constructor(readonly sessionId: number) {}
        }

        class SessionManager {
            @dep({ key: 'Session' }) Session!: typeof Session;

            createSession(id: number): Session {
                return new this.Session(id);
            }
        }

        it('allows binding classes', () => {
            const mesh = new Mesh();
            mesh.class(Session);
            mesh.bind(SessionManager);
            const SessionClass = mesh.resolve('Session');
            assert.strictEqual(SessionClass, Session);
            const mgr = mesh.resolve(SessionManager);
            const sess = mgr.createSession(42);
            assert.ok(sess instanceof Session);
        });

    });

});
