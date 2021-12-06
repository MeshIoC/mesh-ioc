# Mesh IoC

Powerful and lightweight alternative to Dependency Injection (DI) solutions like [Inversify](https://inversify.io/).

Mesh IoC solves the problem of dependency management of application services. It wires together application services (i.e. singletons instantiated once and scoped to an entire application) and contextual services (e.g. services scoped to a particular HTTP request, WebSocket connection, etc.)

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

// Scopes:

// Declare scoped bindings
mesh.scope('request')
    .service(UsersRouter)
    .service(OrdersRouter);

// Create and use scope
const request = mesh.createScope('request')
    // Bind scope-specific data
    .constant(Request, req)
    .constant(Response, res);

// Scoped services can use scope-specific data
class UsersRouter {
    @dep() req!: Request;
    @dep() res!: Response;
}

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

class AppMesh extends Mesh {
    // List all services so that mesh connects them together
    this.service(Redis);
    this.service(Logger, ConsoleLogger);
}
```

There are several aspects that differentiate Mesh IoC from the rest of the DI libraries.

  - Mesh is used only for services, so service instances are cached in mesh. If you only have a single mesh instance, the services will effectively be singletons. However, if multiple mesh instances are created, then each mesh will track its own service instances.

    - If you're familiar with Inversify, this effectively makes all bindings `inSingletonScope`.

  - Service keys are in fact strings — this makes it much easier to get the instances back from mesh, especially if you don't have direct access to classes. When binding to abstract classes, the class name becomes the service key.

    - So in our example above there are two service keys, `"Logger"` and `"Redis"`.

  - When declaring a dependency and using abstract class type, service key is automatically inferred from the type information — so you don't have to type a lot!

    - In our example, `@dep() logger!: Logger` the service key is inferred and becomes `"Logger"`.

  - Properties decorated with `@dep` are automatically replaced with getters. Instance resolution/instantiating happens on demand, only when the property is accessed.

  - Mesh can handle circular dependencies, all thanks to on-demand resolution. However, due to how Node.js module loading works, `@dep` will be unable to infer _one_ of the service keys (depending on which module happened to load first). It's a good practice to use explicit service keys on both sides of circular dependencies.

  - Constant values can be bound to mesh. Those could be instances of other classes.

**Important!** Mesh should be used to track _services_. We defined services as classes with **zero-argument constructors** (this is also enforced by TypeScript). However, there are multiple patterns to support constructor arguments, read on!

## Application Architecture Guide

This short guide briefly explains the basic concepts of a good application architecture where all components are loosely coupled, dependencies are easy to reason about and are not mixed with the actual data arguments.

1. Identify the layers of your application. Oftentimes different components have different lifespans or, as we tend to refer to it, scopes:

  - **Application scope**: things like database connection pools, servers and other global components are scoped to entire application; their instances are effectively singletons (i.e. you don't want to establish a new database connection each time you query it).
  - **Request/session scope**: things like traditional HTTP routers will depend on `request` and `response` objects; the same reasoning can be applied to other scenarios, for example, web socket server may need functionality per each connected client — such components will depend on client socket.
  - **Short-lived per-instance scope**: if you use "fat" classes (e.g. Active Record pattern) then each entity instances should be conceptually "connected" to the rest of the application (e.g. `instance.save()` should somehow know about the database)

2. Build the mesh hierarchy, starting from application scope, descending into more granular scopes.

    ```ts
    // app.ts
    export class App {
        // You can either inherit from Mesh or store it as a field.
        // Name parameter is optional, but can be useful for debugging.
        mesh: Mesh;

        constructor() {
            this.mesh = new Mesh('App')
                // Define your application-scoped services
                .constant(App, this)
                .service(Logger, GlobalLogger);
                .service(MyDatabase);
                .service(MyServer);
                // Define your session-scoped services
                .scope('session')
                .service(Logger, SessionLogger)
                .service(SessionScopedService);
        }

        start() {
            // Define logic for application startup
            // (e.g. connect to databases, start listening to servers, etc)
            this.mesh.resolve(MyServer).listen();
        }

        startSession(req: Request, res: Response) {
            // Bind session-specific data (e.g. request, response, client web socket, session id, etc)
            const sessionMesh = this.mesh.createScope('session')
                // Session-specific data can be bound by session-scoped services
                .constant(Request, req)
                .constant(Response, res);
            // Define logic for session initialisation
            sessionMesh.resolve(SessionScopedService).doStuff();
        }
    }
    ```

3. Create an application entrypoint (advice: never mix modules that export classes with entrypoint modules!):

    ```ts
    // bin/run.ts

    const app = new App();
    app.start();
    ```

4. Identify the proper component for session entrypoint:

    ```ts
    export class MyServer {
        @dep() app!: App;

        // The actual server (e.g. http server or web socket server)
        server: Server;

        constructor() {
            this.server = new Server((req, res) => {
                // This is the actual entrypoint of Session
                app.startSession(req, res);
            });
        }
    }
    ```

5. Use `@dep()` to transparently inject dependencies in your services:

    ```ts
    export class SessionScopedService {

        @dep() database!: Database;
        @dep() req!: Request;
        @dep() res!: Response;

        // ...
    }
    ```

6. Come up with conventions and document them, for example:

  - create different directories for services with different scopes
  - separate entrypoints from the rest of the modules
    - entrypoints only import, instantiate and invoke methods (think "runnable from CLI")
    - all other modules only export stuff

You can take those further and adapt to your own needs. Meshes are composable and the underlying mechanics are quite simple. Start using it and you'll get a better understanding of how to adapt it to the needs of your particular case.

## Advanced

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

## License

[ISC](https://en.wikipedia.org/wiki/ISC_license) © Boris Okunskiy
