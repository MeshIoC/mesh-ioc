# Mesh IoC

Powerful and lightweight alternative to Dependency Injection (DI) solutions like [Inversify](https://inversify.io/).

Mesh IoC solves the problem of dependency management of application services. It wires application services togethert (i.e. singletons instantiated once and scoped to an entire application) and contextual services (e.g. services scoped to a particular HTTP request, WebSocket connection, etc.)

## Key features

- 👗 Very slim — about 2KB minified, few hundred bytes gzipped
- ⚡️ Blazing fast
- 🧩 Flexible and composable
- 🌿 Ergonomic
- 🐓 🥚 Tolerates circular dependencies
- 🕵️‍♀️ Provides APIs for dependency analysis

## Quick API Cheatsheet

```ts
// Mesh is an IoC container that stores service bindings and instantiated objects
const mesh = new Mesh('someName');

// Bindings:

// 1. Service (zero-arg constructor) to itself
mesh.service(SomeDatabase);
// 2. Abstract class to service implementation
mesh.service(Logger, SomeLogger);
// 3. String key to service (👎 because of limited type support)
mesh.service('Something', Something);
// 4. Service to instance
mesh.constant(SomeService, someServiceInstance);
// 5. String key to arbitrary constant
mesh.constant('SessionId', 42);
// 6. Alias (key to another key)
mesh.alias('DB', SomeDatabase);

// Methods can also be chained
mesh.service(MyFoo)
    .alias(Foo, MyFoo)
    .constant('Secret', 'supersecret');

// Declarative bindings in services:

class SomeDatabase {
    @dep() logger!: Logger; // auto-resolved by Mesh
}

// Manual resolution:

const db = mesh.resolve(SomeDatabase);

// Connect instances:

class User {
    @dep() db!: MyDatabase;
}

const user = mesh.connect(new User());  // now user.db will also be resolved by Mesh

// Middleware:
mesh.use(instance => {
    // Allows modifying instances as they are created or connected
    // (useful for logging, stats or replacing instances with proxies)
    console.log('Instantiated', instance);
    return instance;
});
```

## IoC Recap

[IoC](https://en.wikipedia.org/wiki/Inversion_of_control) when applied to class dependency management states that each component should not resolve their dependencies — instead the dependencies should be provided to each component.

This promotes [SoC](https://en.wikipedia.org/wiki/Separation_of_concerns) by ensuring that the components depend on the interfaces and not the implementations.

Consider the following example:

```ts
class UserService {
    // BAD: logger is a dependency and should be provided to UserService
    protected logger = new SomeLogger();
}

class AccountService {
    // GOOD: now application can choose which exact logger to provide
    constructor(protected logger: Logger) {}
}
```

Here two classes use some logging functionality, but approach very differently to specifying how to log.
`UserService` instantiates `SomeLogger`, thus deciding which exact implementation to use.
On the other hand `AccountService` accepts logger as its constructor argument, thus stating that the consumer should make a decision on which logger to use.

Traditional IoC systems use a technique called Dependency Injection (DI) which involves two parts:

  - in service classes constructor arguments are decorated with "service key", in most cases the interface or abstract class is used as a service key (e.g. `Logger` would do for the previous example)

  - application defines a "composition root" (also known as "container") where service keys are linked with the exact implementation (e.g. `SomeLogger` is bound to `Logger`)

The rest of the application should avoid instantiating services directly, instead it asks the container to provide them. Container makes sure that all dependencies are instantiated and fulfilled. Numerous binding options make DI systems like [Inversify](https://inversify.io/) very flexible and versatile.

Mesh IoC is very similar to DI conceptually:

  - `Mesh` is also composition root where all the bindings are declared
  - The services also demarcate their dependencies with a decorator, and the mesh makes sure they are resolved.

However, it differs from the rest of the DI systems substantially. The next section will explain the main concepts.

## Mesh Concepts

Mesh is an IoC container which associates service keys with their implementations. When a service instance is "connected" to mesh its dependencies will be instantiated and resolved by the mesh automatically. Service dependencies are specified declaratively using property decorators.

Consider a following tiny example:

```ts
// logger.ts

abstract class Logger {
    abstract log(message: string): void;
}

class ConsoleLogger extends Logger {
    log(message: string) {
        console.log(message);
    }
}

// redis.ts

class Redis {
    redis: RedisClient;

    @dep() logger!: Logger; // Declares that Redis depends on Logger

    constructor() {
        this.redis = new RedisClient(/* ... */);
        this.redis.on('connect', () => {
            // Logger can now be used by this class transparently
            this.logger.log('Connected to Redis');
        });
    }
}

// app.ts

class App {
    mesh = new Mesh('App'); // Optional string identifier helps with debugging resolution problems

    constructor() {
        // List all services so that mesh connects them together
        this.mesh.service(Redis);
        this.mesh.service(Logger, ConsoleLogger);
    }
}
```

There are several aspects that differentiate Mesh IoC from the rest of the DI libraries.

  - Service instances are cached in mesh. If you only have a single mesh instance, the services will effectively be singletons. However, if multiple mesh instances are created, then each mesh will track its own service instances.

    - If you're familiar with Inversify, this effectively makes all bindings `inSingletonScope`.

  - Service keys are in fact strings — this makes it much easier to get the instances back from mesh, especially if you don't have direct access to classes. When binding to abstract classes, the class name becomes the service key.

    - So in our example above there are two service keys, `"Logger"` and `"Redis"`.

  - When declaring a dependency and using abstract class type, service key is automatically inferred from the type information — so you don't have to type a lot!

    - In our example, `@dep() logger!: Logger` the service key is inferred and becomes `"Logger"`.

  - Properties decorated with `@dep` are automatically replaced with getters. Instance resolution/instantiating happens on demand, only when the property is accessed.

  - Mesh can handle circular dependencies, all thanks to on-demand resolution. However, due to how Node.js module loading works, `@dep` will be unable to infer _one_ of the service keys (depending on which module happened to load first). It's a good practice to use explicit service keys on both sides of circular dependencies.

  - Constant values can be bound to mesh. Those could be instances of other classes or just arbitrary values bound by string keys.

**Important!** Mesh should be used to track _services_. We define services as classes with **zero-argument constructors** (this is also enforced by TypeScript). However, there are multiple patterns to support constructor arguments, read on!

## Application Architecture Guide

This short guide briefly explains the basic concepts of a good application architecture where the components are loosely coupled, dependencies are easy to reason about and are not mixed with the actual data arguments.

### Scopes

Oftentimes different application components have different lifespans or scopes.

For example:

- **Application scope**: things like database connection pools, servers and other global components are scoped to entire application; their instances are effectively singletons (i.e. you don't want to establish a new database connection each time you query it).

- **Request/session scope**: things like traditional HTTP routers will depend on request and response objects; the same reasoning can be applied to other scenarios, for example, web socket server may need functionality per each connected client — such components will depend on client socket.

- **Short-lived per-instance scope**: if you use "fat" classes (e.g. Active Record pattern) then each entity instances should be conceptually "connected" to the rest of the application (e.g. `instance.save()` should somehow know about the database).

In the following sections we'll explore the best practices to organise the application components and to achieve a clear demarcation of scopes.

### Composition Root and Entrypoint

The term "app" is often very ambiguous when it comes to module organisation. For example, most http backend frameworks consider an "app" to be component responsible for routing and listening to HTTP requests, whereas most frontend frameworks would consider an "app" to be the root component with some setup.

It is also a common practice to mix the "app" with the actual entrypoint, i.e. the app module would be an equivalent of the "main" function that gets executed as soon as the script is parsed. This later results in problems with unit testing (i.e. the test runtime cannot use the "app" part separately from the "entrypoint" which typically results in the decisions like "unit test applications by sending HTTP requests to them").

With IoC the "app" term gets a well-defined meaning: `App` is a composition root, a "centralized registry" of application-scoped components.

For application scope one must make sure that only a single `mesh` instance is maintained throughout a lifecycle:

```ts
// src/main/app.ts
export class App {
    mesh = new Mesh('App');

    constuctor() {
        // Add application-scoped (singleton) bindings, e.g.
        this.mesh.service(Logger, GlobalLogger);
        this.mesh.service(MyDatabase);
        this.mesh.service(MyHttpServer);
        // ...
    }

    async start() {
        // Define logic for application startup, e.g.
        await this.mesh.resolve(MyDatabase).connect();
        await this.mesh.resolve(MyHttpServer).listen();
        // ...
    }

    async stop() {
        // Define logic for application shutdown, e.g.
        await this.mesh.resolve(MyHttpServer).close();
        await this.mesh.resolve(MyDatabase).close();
        // ...
    }

}
```

The entrypoint would be an actual "main" function that instantiates the `App` class and calls its `start` method:

```ts
// src/bin/serve.ts
import { App } from '../main/app.js';

const app = new App();
app.start()
    .catch(err => {
        // Setup app initialization error handling
        process.exit(1);
    });
```

### Test runtime setup

Test runtime can create a fresh `App` instance on every test case, e.g.:

```ts
// src/test/runtime.ts
import { App } from '../main/app.js';

let app: TestApp;

beforeEach(() => {
    app = new TestApp();
});

export class TestApp extends App {

    constructor() {
        super();
        // Setup test application
        // e.g. one can substitute real components with mocks
        this.mesh.service(ThirdPartyServiceMock);
        this.mesh.alias(ThirdPartyService, ThirdPartyServiceMock);
        // ...
    }
}
```

Each test would then be able to access `app` and re-bind any of the dependencies without affecting other test cases.

### Creating request/response scopes

Mesh IoC opts for maximum simplicity by following a straighforward model: each mesh instance is a scope.

Therefore, to create a scope, say, per HTTP request we need to simply create a mesh instance inside the HTTP handler. It's also a good idea to keep the logic of creating HTTP-scoped mesh inside the composition root, so that it can be overridden in tests.

```ts
// src/main/app.ts

export class App {
    mesh = new Mesh('App');

    constructor() {
        // ...
        this.mesh.service(MyServer);
        // Bind the function that creates a scoped mesh, so that the server could use it.
        this.mesh.constant('createRequestScope', (req: Request, res: Response) => this.createRequestScope());
    }

    protected createRequestScope(req: Request, res: Response) {
        const mesh = new Mesh('Request');
        // Allow request-scoped classes to also resolve app-scoped dependencies
        mesh.parent = this.mesh;
        // Scoped variables (req, res) can be bound as constants
        mesh.constant(Request, req);
        mesh.constant(Response, res);
        // Create request-scoped bindings
        mesh.service(Router, MyRouter);
        // ...
        return mesh;
    }

}
```

Then in `MyServer`:

```ts
export class MyServer {

    @dep({ key: 'createRequestScope' }) createRequestScope!: (req: Request, res: Response) => Mesh;

    handleRequest(req: Request, res: Response) {
        // This is an "entrypoint" of request scope
        const mesh = this.createRequestScope(req, res);
        // For example, let's delegate request handling to the Router
        const router = mesh.resolve(Router);
        router.handle();
    }
}
```

In our example, `Router` is a request-scoped class and thus can access `req` and `res`:

```ts
export class MyRouter extends Router {

    @dep() req!: Request;
    @dep() res!: Response;

    async handle() {
        // ...
    }
}
```

### Connecting "guest" instances

Mesh IoC allows connecting an arbitrary instance to the mesh, so that the `@dep` can be used in it.

For example:

```ts
// This entity class is not managed by Mesh directly, instead it's instantiated by UserService
class User {
    @dep() database!: Database;

    // Note: constructor can have arbitrary arguments in this case,
    // because the instantiation isn't controlled by Mesh
    constructor(
        public firstName = '',
        public lastName = '',
        public email = '',
        // ...
    ) {}

    async save() {
        await this.database.save(this);
    }
}

class UserService {
    // Note: Mesh is automatically available in all connected services
    @dep() mesh!: Mesh;

    createUser(firstName = '', lastName = '', email = '', /*...*/) {
        const user = new User();
        // Now connect it to mesh, so that User can access its services via `@dep`
        return this.mesh.connect(user);
    }
}
```

Note: the important limitation of this approach is that `@dep` are not available in entity constructors (e.g. `database` cannot be resolved in `User` constructor, because by the time the instance is instantiated it's not yet connected to the mesh).

## Tips and tricks

- Use classes as service keys whenever possible, this adds an additional compile-time type check to ensure that the implementation matches the declaration.

- TypeScript `interface` cannot be a service key, because it does not exist at runtime. Use `abstract class` instead.

- Don't be too dogmatic about interface/implementation split. For example, if all class methods are its public interface, there is no point in splitting it into an "interface" and its single implementation (e.g. ` abstract Config` and `ConfigImpl`) — this provides close to zero practical value and contributes towards people disliking the OOP paradigm for its verbosity and cargo culting. Instead just bind the concrete class to itself.

## License

[ISC](https://en.wikipedia.org/wiki/ISC_license) © Boris Okunskiy
