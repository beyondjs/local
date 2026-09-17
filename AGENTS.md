# local agent instructions

Canonical instructions for this independent repository and its descendants. The coordinated branch is `feature/next`, preserving original master and current work. Tool-specific files must only reference AGENTS.md.

Development integration client: inspector registration, HMR notifications, application/global style updates and service launcher commands. Read [runtime behavior and integration](docs/runtime.md) before changing these contracts. Kernel owns runtime module state; Backend provides transport and launcher RPC. The development server compiles and delivers artifacts. No sibling checkout is required to read this repository's instructions.

- Use English for first-party instructions, documentation, comments and explanatory text. Preserve public identities, protocol keys, intentional locale data and functional fixtures; leave vendor/generated files intact.
- Preserve source changes and history. Do not commit, push, reset, publish, deploy or change dependency/package identities without task authorization.
- Keep legacy Engine bootstrap and newer Packages target serving distinct. Engine supplies implementation ESM to modern BEE Node; Packages must serve the target app and HMR.
- Trace actual consumers before changing runtime exports, module identity or HMR semantics. Distinguish source inspection from execution evidence; one transport failure does not establish an architectural failure.
- Read nested AGENTS before editing. Validate proportionately; documentation-only work does not require installations, servers or runtime tests.

Current naming and scope: the new Beyond-authored client runtime will unify Kernel/Local development capabilities for local and cloud servers while preserving production-needed runtime behavior. `local-2026` is a provisional working name, not the approved final name. Dev is only under consideration. The final public name, API and migration contract are not defined; preserve production-needed behavior and existing public identities until an explicit implementation task selects compatible changes.

Documentation follows [the local documentation standards](docs/AGENTS.md).
