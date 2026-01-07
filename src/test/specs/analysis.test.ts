import assert from 'assert';

import { dep } from '../../main/dep.js';
import { Mesh } from '../../main/mesh.js';

describe('dependency analysis', () => {

    //  A - B - C - G
    //   \   \   \
    //    D - E - F

    class A {}

    class B {
        @dep() a!: A;
    }

    class C {
        @dep() b!: B;
    }

    class D {
        @dep() a!: A;
    }

    class E {
        @dep() d!: D;
        @dep() b!: B;
    }

    class F {
        @dep() c!: C;
        @dep() e!: E;
    }

    class G {
        @dep() c!: C;
    }

    class EImpl extends E {
        @dep({ key: 'EDep' }) eDep!: any;
    }

    class FImpl extends F {
        @dep({ key: 'FDep' }) fDep!: any;
    }

    describe('allDeps', () => {

        it('returns all dependencies encountered in bindings attached to a single mesh', () => {
            const mesh = new Mesh();
            mesh.service(A);
            mesh.service(B);
            mesh.service(C);
            mesh.service(D);
            mesh.service(E, EImpl);
            mesh.service(F, FImpl);
            mesh.service(G);
            const deps = [...mesh.allDeps()];
            const depKeys = deps.map(_ => _.key).sort();
            assert.deepStrictEqual(depKeys, ['A', 'B', 'C', 'D', 'E', 'EDep', 'FDep']);
        });

        it('returns all dependencies in mesh hierarchy', () => {
            const parent = new Mesh('Parent');
            parent.service(A);
            parent.service(B);
            parent.service(C);
            const child = new Mesh('Child', parent);
            child.service(D);
            child.service(E, EImpl);
            child.service(F, FImpl);
            child.service(G);
            const deps = [...child.allDeps()];
            const depKeys = deps.map(_ => _.key).sort();
            assert.deepStrictEqual(depKeys, ['A', 'B', 'C', 'D', 'E', 'EDep', 'FDep']);
        });

    });

    describe('missingDeps', () => {

        it('returns missing dependencies', () => {
            const mesh = new Mesh();
            mesh.service(B);
            mesh.service(D);
            mesh.service(E, EImpl);
            mesh.service(F, FImpl);
            const missingDeps = [...mesh.missingDeps()];
            const missingDepKeys = missingDeps.map(_ => _.key).sort();
            assert.deepStrictEqual(missingDepKeys, ['A', 'C', 'EDep', 'FDep']);
        });

    });

});
