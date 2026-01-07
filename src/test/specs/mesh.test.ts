import assert from 'assert';

import { dep } from '../../main/index.js';
import { Mesh } from '../../main/mesh.js';
import { Database } from '../services/database.js';
import { Logger, StandardLogger, TestLogger } from '../services/logger.js';

describe('Mesh', () => {

    describe('bindings', () => {

        it('creates an instance of bound service', () => {
            const mesh = new Mesh();
            mesh.service(Logger, StandardLogger);
            const logger = mesh.resolve(Logger);
            assert.ok(logger instanceof StandardLogger);
        });

        it('caches the instance, so the same instance is returned', () => {
            const mesh = new Mesh();
            mesh.service(Logger, StandardLogger);
            const logger1 = mesh.resolve(Logger);
            const logger2 = mesh.resolve(Logger);
            assert.ok(logger1 === logger2);
        });

    });

    describe('resolve', () => {

        it('resolves binding by class name', () => {
            const mesh = new Mesh();
            mesh.service(Logger, StandardLogger);
            const logger = mesh.resolve<Logger>('Logger');
            assert.ok(logger instanceof StandardLogger);
        });

        it('throws if not found', () => {
            const mesh = new Mesh();
            try {
                mesh.resolve<Logger>('Logger');
                throw new Error('UnexpectedSuccess');
            } catch (err: any) {
                assert.strictEqual(err.name, 'MeshBindingNotFound');
            }
        });

    });

    describe('tryResolve', () => {

        it('resolves binding by class name', () => {
            const mesh = new Mesh();
            mesh.service(Logger, StandardLogger);
            const logger = mesh.tryResolve<Logger>('Logger');
            assert.ok(logger instanceof StandardLogger);
        });

        it('returns undefined if not found', () => {
            const mesh = new Mesh();
            const logger = mesh.tryResolve<Logger>('Logger');
            assert.strictEqual(logger, undefined);
        });

    });

    describe('allBindings', () => {

        it('returns all bidings recursively', () => {
            const parentMesh = new Mesh('Parent');
            parentMesh.service(class Foo {});
            parentMesh.service(class Bar {});
            const childMesh = new Mesh('Child', parentMesh);
            childMesh.service(class Baz {});
            const bindings = [...childMesh.allBindings()];
            const keys = bindings.map(_ => _[0]);
            assert.deepStrictEqual(keys, ['Mesh', 'Baz', 'Mesh', 'Foo', 'Bar']);
        });

    });

    describe('dependency resolution', () => {

        it('resolves dependency decorated with @dep', () => {
            const mesh = new Mesh();
            mesh.service(TestLogger);
            mesh.alias(Logger, TestLogger);
            mesh.service(Database);
            const db = mesh.resolve(Database);
            assert.ok(db.logger instanceof TestLogger);
            db.connect();
            const testLogger = mesh.resolve(TestLogger);
            assert.deepStrictEqual(testLogger.messages, ['Connected to database']);
        });

    });

    describe('connect', () => {

        it('allows connecting "guest" instances so they can use @dep', () => {
            const mesh = new Mesh();
            mesh.service(Logger, TestLogger);
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
            mesh.service(Logger, TestLogger);
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

});
