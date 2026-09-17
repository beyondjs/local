# @beyond-js/local

Local connects Beyond applications to development services. It listens for JavaScript and stylesheet changes, delegates updates to Kernel and widget consumers, and exposes launcher status/start/stop operations through Backend.

Read [runtime behavior and integration](docs/runtime.md) for the public singleton, registration, notification protocol, update sequences, dependency contracts and lifecycle limitations. The guide also defines requirements for integrating these responsibilities into a future runtime.

Local is authored as a Beyond package: `main/module.json` declares the public `@beyond-js/local/main` module, while its nested files are internal implementation components. Its manifest contains build/distribution configuration; importing ordinary TypeScript files does not supply Beyond's generated context or loader globals.
