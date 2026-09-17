# Local: runtime behavior and integration

Local connects a Beyond runtime to development services. It subscribes to inspector notifications, asks the existing module runtime to import changed JavaScript, signals registered modular styles, updates application/global styles, and exposes service-launcher commands. It does not compile source, own the internal-module registry, implement the Node custom loader, or launch operating-system processes itself.

Kernel owns bundle/package instances, internal creators and hashes, export updates and consumer events. Backend provides endpoint registration, a shared socket and launcher RPC. The development server owns compilation and artifact delivery. A replacement runtime must preserve those responsibility boundaries while supporting configured local or cloud endpoints. The package manifest identifies this implementation as `@beyond-js/local` 0.1.4; consumers must verify their resolved dependency version before relying on a specific behavior.

This guide describes the implemented Local contracts and their limitations. The final section states requirements for a future integrated runtime; it does not define a finished replacement API. Source references to other repositories are informational and use each repository's own path, so this repository can be read independently.

## Modules and configuration

There is one public Beyond module and five TypeScript implementation files. Source folders are internal implementation organization, not independently published public modules.

| File | Role and behavior |
| --- | --- |
| [package.json](../package.json) | Public package identity; top-level `modules.path: "./"`; library imports Kernel and Backend; npm dependency `socket.io-client: ^4.5.4`; web/node deployment definitions on 9123/9124, both selecting tsc. These are build/deployment settings, not inspector endpoint configuration. |
| [main/module.json](../main/module.json) | Public `@beyond-js/local/main`; `bundle: "ts"`, all platforms, files glob. Only `local` is explicitly marked as a public bundle export in these implementation sources. |
| [main/tsconfig.json](../main/tsconfig.json) | ES2017 target, ES2020 modules, Node resolution, experimental decorators. This alone neither supplies Beyond generated context nor proves all DOM paths run in Node. |
| [main/local.ts](../main/local.ts) | Exported singleton; registration guard, endpoint registration, construction and read-only access to launchers/HMR/application helpers. |
| [main/hmr/index.ts](../main/hmr/index.ts) | Notification subscription, JS identity/counter/import path, CSS registry signaling and logged error handling. |
| [main/application/index.ts](../main/application/index.ts) | Browser guard, application/global link updates, Widgets global-style hook, local Events notifications. |
| [main/launchers/index.ts](../main/launchers/index.ts) | Lazy per-ID cache of Launcher instances. |
| [main/launchers/launcher.ts](../main/launchers/launcher.ts) | Promise-valued status getter and asynchronous start/stop commands through generated module context. |
| [.devcontainer/Dockerfile](../.devcontainer/Dockerfile), [.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json) | Historical Node 18 container, global Beyond 1.2.0/scaffolding installation and editor configuration. These recipes do not provide a modern BEE Node integration. |
| [.gitignore](../.gitignore) | Excludes generated `.beyond`, IDE state, node_modules and package-lock. No checked-in lockfile or test runner is supplied by this checkout. |
| [README](../README.md), [AGENTS](../AGENTS.md), [CLAUDE](../CLAUDE.md) | Human entrypoint, canonical repository instructions and thin tool reference. |

## Public object model and registration

The singleton is written as `export /*bundle*/ const local = new class BeyondLocal { ... }`. It owns private collaborators with getters `launchers`, `hmr` and `application`. Before registration the getters return uninitialized fields. Importing the module creates the singleton but does not itself call `register` or subscribe to notifications.

`local.register(inspect, devServer)` performs these synchronous steps in order:

1. Reject a second call once the private registered flag is truthy.
2. Set the flag before performing any further work.
3. Register Backend under `@beyond-js/local` with `http://localhost:${inspect}`.
4. Construct the Launchers collection, HMR helper with `devServer`, then Application helper.

It returns no Promise or readiness object. HMR and Application constructors start asynchronous subscriptions and catch/log setup rejection independently. Successful return from `register` therefore does not prove the socket is connected or that either listener is installed. A synchronous setup failure leaves the guard set; asynchronous failures do not reset it. There is no validation for ports, no endpoint reconfiguration and no destroy/reset method. The comment presents `devServer` as optional, while the TypeScript signature declares a required number; runtime branches accept an omitted/falsy value and known legacy callers supply only `inspect`.

Backend's registry (backend repository, `modules/client/backends.ts`) preserves its first registration for a package. If that identity is already registered, Local does not replace its host. Backend's socket wrapper (backend repository, `modules/client/socket/index.ts`) obtains and caches the Socket.IO client, uses WebSocket transport, and returns the socket without waiting for a connection-success event. Both helpers retrieve that package's backend/socket; they do not create independent protocol servers.

Legacy bootstrap examples are Engine's SystemJS HTML generator (engine repository, `lib/engine/process/core/applications/resources/index.html/process/head/main/sjs.js`), its AMD equivalent (engine repository, `lib/engine/process/core/applications/resources/index.html/process/head/main/amd.js`), and legacy BEE initialization (bee repository, `index.js`). Engine conditionally appends registration when development tools, inspector information and the required module qualify. These callers use legacy loader integration. Modern BEE Node resolves and loads ECMAScript modules using Node custom hooks; it does not automatically provide Local's declared global `bimport` and `brequire`. Those functions are requirements on Local's execution environment, not implementations supplied by Local.

## Bundle notification protocol and JavaScript path

The inspector service (engine repository, `lib/inspect/service/index.js`) forwards compiler bundle changes as `bundle/change`. It sends `specifier`, `vspecifier`, `extname`, `distribution`, and `language`. Local declares a message interface with all except `specifier`, then destructures only `vspecifier`, `language`, and `extname`. There is no runtime schema validation and no distribution filtering. Only `.js` and `.css` dispatch; other extensions do nothing.

The JavaScript path in [HMR](../main/hmr/index.ts) is:

1. Require an exact `vspecifier` match in Kernel's Bundle instances registry (kernel repository, `src/modules/bundle/instances.ts`). Unloaded bundle identities are ignored.
2. Select `bundle.package(language !== '.' ? language : '')`. A registered bundle is sufficient: this does not test whether the selected language package was previously loaded. Kernel's package getter (kernel repository, `src/modules/bundle/bundle.ts`) may construct a missing language package and rejects nonempty language strings whose length is not two.
3. Retrieve a counter keyed by bundle `vspecifier`, initially zero, then increment the stored value. The value used for this attempt is the old counter. Different languages share that counter; there is no distribution key, authoritative server revision, content hash or success acknowledgement.
4. Without a truthy `devServer`, import `${pkg.vspecifier}?hmr=${change}`. This preserves the selected package's language-qualified identity through Kernel's package representation.
5. With `devServer`, strip the scope (if present) and package name from the incoming bundle identity, then import `http://localhost:${devServer}/${subpath}.js?hmr=${change}`. This path uses the incoming bundle identity, not the selected language package identity. It assumes that server serves the intended package at its root; it drops package disambiguation and does not encode language or distribution selection.
6. Await `bimport(resource, change)`. The second argument is part of the legacy import contract and is not a native dynamic-import API. Local does not inspect the imported exports or call Kernel Package.update itself; the served patch and loader/runtime must perform that update.

For a hypothetical already-registered `@suite/shared@1.0.0/message`, neutral language `.` and no override, the first request is `@suite/shared@1.0.0/message?hmr=0` with second argument `0`. With override port 6610, it is `http://localhost:6610/message.js?hmr=0`. These examples show the request construction; the endpoint must serve the corresponding selected package.

Import errors are caught and logged; the consumed counter is not rolled back. Earlier failures (message destructuring, registry/package selection) reach the subscription's outer catch and are logged there. Asynchronous event handlers run independently, so multiple imports can overlap and finish in a different order. There is no queue, coalescing, cancellation, transactional rollback, acceptance/disposal protocol or missed-event reconciliation here. Socket.IO reconnection alone would not supply those semantics.

The effective importer must be verified in the emitted artifact. Kernel's own bimport helper (kernel repository, `src/modules/bundle/bimport/bimport.ts`) blindly appends `?version=N` for a truthy second argument in its SystemJS/native branches: passing `resource?hmr=1` and `1` directly produces `resource?hmr=1?version=1`, rather than two query parameters. The zero attempt does not append it. However, Engine's browser emission (engine repository, `lib/engine/process/bundler/bundle/packager/code/js/package/process.js`) can inject a single-argument local bimport wrapper, and legacy BEE can supply its own global implementation. Do not attribute the helper's direct-call behavior to every generated Local artifact without checking that adapter. The final request URL depends on the selected adapter.

The behavior Local must connect is Kernel's existing internal creators, hashes, export updates and HMR events. An outer ECMAScript artifact can contain internal creator wrappers. Its patch must address the existing Kernel Package, compare internal hashes, replace changed creators and refresh export bindings before notifying consumers. Local neither knows individual source-file IDs nor computes reverse dependencies. Native ESM loading on its own does not reproduce those operations.

## Modular CSS path

For `.css`, Local first checks `typeof location === 'object'`; otherwise it returns. It dynamically imports `@beyond-js/kernel/styles`, ignores identities absent from the registry, then calls `styles.get(vspecifier).change()`.

For Kernel V1Styles (kernel repository, `src/modules/styles/v1.ts`), `change()` increments the style version and emits `change`. It does not fetch CSS. DependenciesStyles (kernel repository, `src/modules/styles/dependencies-styles.ts`) connects registered styles through bundle dependencies, and widget consumers handle new URLs and adoption. Local does not manipulate widget shadow roots or wait for stylesheet load success.

Kernel's registry (kernel repository, `src/modules/styles/registry.ts`) can also contain LegacyStyles (kernel repository, `src/modules/styles/legacy.ts`), which has no `change()` method. Local checks registry membership but not the entry kind. A legacy entry on this path would fail at that call and be logged by the outer event catch. This call is unsupported for a LegacyStyles entry.

The CSS guard differs from Application's process guard. A worker without location ignores these changes, while an environment with location but no usable DOM may reach Kernel/browser code. A platform declaration of `*` does not establish uniform environment support.

## Application and global styles

[Application](../main/application/index.ts) extends Kernel Events. Its constructor exits if `globalThis.process` is defined at all, including a browser process shim; otherwise it subscribes to `application-styles` and `global-styles`. Their payloads are ignored.

| Inspector event | Immediate DOM action | Subsequent action and local notification |
| --- | --- | --- |
| `application-styles` | Set `beyond-application-styles` element's href to `/styles.css?updated=<Date.now()>`. | Trigger `application:change`. |
| `global-styles` | Set `beyond-global-styles` element's href to `/global.css?updated=<Date.now()>`. | Synchronously obtain Kernel bundle exports through `brequire`; if exact registry key `@beyond-js/widgets/render` exists, obtain `package().exports.values.globalcss` and call `update()`; then trigger `global:change`. |

These local events have no payload and indicate that the synchronous update code ran, not that the browser downloaded/applied the stylesheet. The code does not wait for link load/error. A missing link element throws before notification; a missing Widgets export throws after the link mutation but before `global:change`. The socket callbacks do not wrap these synchronous operations in their own try/catch. The constructor catch covers subscription setup, not later callback exceptions.

The synchronous Kernel lookup is another loader-sensitive contract: Kernel's own brequire (kernel repository, `src/modules/bundle/bimport/brequire.ts`) searches full Package instances, while Engine's special Kernel bundle bootstrap (engine repository, `lib/engine/process/bundler/bundle/packager/code/js/package/process.js`) constructs a BeyondPackage rather than that normal registered Package. A loader-provided brequire may special-case Kernel; the global fallback is not proof this lookup succeeds. Verify the selected runtime's actual Kernel lookup before testing the subsequent Widgets branch.

Engine's HTML head generator (engine repository, `lib/engine/process/core/applications/resources/index.html/process/head/index.js`) conditionally creates those links only when the template has styles, with a platform/application base directory. Local always rewrites to absolute-root URLs, losing that base directory and any previous query parameters. Adding styles after initial HTML omitted the link has no creation path here. Date.now is a cache-busting timestamp, not guaranteed unique for rapid updates.

The Widgets coupling requires explicit compatibility testing. The Widgets implementation exports a per-widget GlobalCSS class (widgets repository, `widgets/src/modules/render/web/widget/styles/global.ts`); StylesManager (widgets repository, `widgets/src/modules/render/web/widget/styles/index.ts`) constructs one privately per widget. That source tree does not export the `globalcss` singleton this call expects. Local also checks an unversioned registry key although Kernel registers by bundle vspecifier. Depending on emitted identity and version, that check may skip the branch, or the expected export may be absent. Additionally, the current GlobalCSS class computes its readonly link once in its constructor; update increments a counter and emits an event without recomputing that link. Integration must verify the emitted identity, exported style object and changing stylesheet URL together. Older installed Widgets artifacts may expose a different contract.

## Launchers and the Backend boundary

[Launchers](../main/launchers/index.ts) lazily caches one Launcher per exact string ID forever. It provides `get(id)` only: no list, delete, invalidate or lifecycle disposal. [Launcher](../main/launchers/launcher.ts) extends Events but never emits a launcher-status event in its own implementation.

| Operation | Actual generated-context call | Result exposed by Local |
| --- | --- | --- |
| Read `launcher.status` | `module.execute('launchers/status', {id})` | New asynchronous request on each access, typed Promise of string; no runtime status validation. |
| `launcher.start()` | `module.execute('launchers/start', {id})` | Await completion, return no response value. |
| `launcher.stop()` | `module.execute('launchers/stop', {id})` | Await completion, return no response value. |

`beyond_context` is generated Beyond module context. Kernel's deprecated Module.execute (kernel repository, `src/modules/bundle/module/index.ts`) obtains Backend and forwards package, `legacy` distribution, module subpath, action and parameters. Backend supplies the client Action transport; Local defines no corresponding server implementation. The receiver for these launcher calls is Engine inspector RPC, not Backend/server's bridge Executor, which interprets a different action format. Engine's launcher actions (engine repository, `lib/inspect/actions/launchers/index.js`) delegate to main-process IPC: status reads launcher data, start/stop forward commands. Starting a process and waiting for it to become ready are different operations.

Backend's optional initiator (backend repository, `modules/client/socket/initiator.ts`) is a real reverse dependency: for a locally configured service it imports Local, builds a package/distribution launcher ID, asks status, starts unless already running, then waits a fixed two seconds. Local itself does not contain that readiness wait. The socket wrapper (backend repository, `modules/client/socket/index.ts`) skips initiation for `@beyond-js/local`, preventing immediate recursive startup of the inspector backend. Backend's initiator also creates a PendingPromise before an early non-local return without settling it; that lifecycle is owned by Backend and must be handled together with Local registration.

For HMR notifications Local uses only `backends.register`, `backends.get`, and `backend.socket.on`. It does not use general RPC to receive a patch event. For launchers, RPC remains part of the observed path. Therefore Backend has concrete value (endpoint/socket reuse and service/RPC integration), but the entire RPC abstraction is not mechanically required for the narrow HMR event path. A replacement must account for both paths, including existing service consumers, before removing that dependency. Choosing a new transport does not by itself define or remove launcher compatibility.

## Lifecycle, environment and failure inventory

| Condition | Source behavior | Consequence for implementation planning |
| --- | --- | --- |
| Registered twice or setup needs retry | Singleton guard throws; no reset. | Define explicit start/readiness/retry ownership without confusing constructed with connected. |
| Socket fails to initialize | Constructors log rejected subscription work. | Caller cannot await failure through register. |
| Disconnect/reconnect | No Local connect/disconnect/reconnect handlers or revision reconciliation. | Transport reconnection is not proof missed changes are recovered. |
| Shutdown or hot replacement of Local itself | No socket listener removal, counter/cache clearing or Local destroy. | Replacing an internal creator does not automatically tear down existing singleton listeners. Inherited Events cleanup would not remove anonymous socket callbacks. |
| Fast JS edits / multiple languages / distributions | Concurrent handlers; counter shared per vspecifier; distribution ignored. | Specify ordering and target identity before asserting deterministic HMR. |
| Browser application/global styles | Requires DOM link IDs, global brequire and compatible optional Widgets export. | Test base path, late style appearance and actual widget adoption. |
| Node | Application helper skips subscription when process exists; JS still requires bundle registry, Backend and bimport; CSS usually skips without location. | Modern BEE Node is not automatically a drop-in provider of these legacy globals. |
| Remote/cloud endpoint | Inspector and override artifact URLs are fixed to HTTP localhost and numeric ports. | New runtime needs configurable endpoint/resolution while retaining responsibility separation. |
| Nonstandard message, missing dependency or unsupported style type | No schema normalization; throws/logs or silently ignores by branch. | Define observable diagnostics and failure policy, then test them. |

## What the new runtime must preserve, repair or decide

Preserve the familiar Beyond-authored structure: a public module backed by focused internal files; an owning singleton/object with private collaborators and simple getters/methods; separate HMR, application-style and launcher responsibilities; Kernel's runtime registry/package/internal-module semantics as their own layer. The current source is the semantic reference, not a requirement to reproduce defects or hardcoded localhost configuration. A source folder does not become a new public import automatically.

Required integration behavior is notification identity → correct artifact resolution/import → update of the existing runtime state → consumer notification, plus modular and application/global stylesheet updates. Consumer-specific widget refresh and style adoption must be tested with the selected new runtime and actual Widgets artifacts. Preserve production-needed Kernel behavior while making inspector connections a deliberate development concern.

The consolidation design must state which public entrypoints and generated-context contracts survive, how readiness/stop and connection ownership work, which transport capabilities remain, how local/cloud endpoints resolve, and how changes are ordered and reconciled. Those are documented implementation contracts to settle against existing consumers; final public names, APIs and migration rules must be defined before implementation changes those contracts.

Acceptance criteria for the integrated runtime:

1. Register with a valid and invalid endpoint; prove awaitable readiness/failure and repeated-stop/listener cleanup under the selected new API.
2. Update a loaded neutral-language module and a language variant; ignore unloaded identities deliberately; keep public bare identity and Kernel registry shared; prove changed/unchanged internal behavior separately.
3. Deliver overlapping changes, a failed import and a disconnect gap; establish the selected ordering/recovery policy and observable failure.
4. Change modular CSS in a widget, then application/global CSS; verify actual computed style after resource loading, non-root base paths, missing initial links and selected Widgets compatibility.
5. Run JavaScript HMR independently in the browser and through modern BEE Node; do not infer Node support from browser success or loader-only success.
6. Exercise launcher status/start/stop with the retained adapter, or document an explicit compatibility boundary if decoupled from the initial event path.

Passing these criteria requires observed runtime behavior with the selected compiler, loader and consumers; successful construction or an HTTP response alone is insufficient.
