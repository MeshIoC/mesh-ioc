# Service Mesh IoC

Powerful and lightweight alternative to Dependency Injection (DI) solutions like [Inversify](https://inversify.io/).

Service Mesh solves the problem of dependency management of application services. It wires together application services (i.e. singletons instantiated once and scoped to an entire application) and contextual services (e.g. services scoped to a particular HTTP request, WebSocket connection, etc.)

## Key features

- 👗 Very slim
- ⚡️ Blazing fast
- 🧩 Flexible and composable
- 🌿 Ergonomic
- 🐓 🥚 Tolerates circular dependencies
- 🕵️‍♀️ Provides APIs for dependency analysis

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

Service Mesh is very similar to DI conceptually:

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
        this.redis.on('connect', () => this.logger.log('Connected to Redis'));
    }
}

// app.ts

class AppMesh extends Mesh {
    this.bind(Logger, ConsoleLogger);
    this.bind(Redis);
}
```

There are several aspects that differentiate Service Mesh from the rest of the DI libraries.

  - Mesh is used only for services, so service instances are cached in mesh. If you only have a single mesh instance, the services will effectively be singletons. However, if multiple mesh instances are created, then each mesh will track its own service instances.

    - If you're familiar with Inversify, this effectively makes all bindings `inSingletonScope`.

  - Service keys are in fact strings — this makes it much easier to get the instances back from mesh, especially if you don't have direct access to classes. When binding to abstract classes, the class name becomes the service key.

    - So in our example above there are two service keys, `"Logger"` and `"Redis"`.

  - When declaring a dependency and using abstract class type, service key is automatically inferred from the type information — so you don't have to type a lot!

    - In our example, `@dep() logger!: Logger` the service key is inferred and becomes `"Logger"`.

  - Properties decorated with `@dep` are automatically replaced with getters. Instance resolution/instantiating happens on demand, only when the property is accessed.

  - Mesh can handle circular dependencies, all thanks to on-demand resolution. However, due to how Node.js module loading works, `@dep` will be unable to infer _one_ of the service keys (depending on which module happened to load first). It's a good practice to use explicit service keys on both sides of circular dependencies.

  - Constant values can be bound to mesh. Those could be instances of other classes.
