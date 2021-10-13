import assert from 'assert';

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

});
