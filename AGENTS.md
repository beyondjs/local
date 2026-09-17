# local agent instructions

Canonical instructions for this independent repository and its descendants. The coordinated branch is `feature/next`, preserving original master and current work. Tool-specific files must only reference AGENTS.md.

Development integration client: inspector registration, HMR notifications, application/global style updates and service launcher commands. Kernel owns runtime module state; Backend provides transport. Read the suite [runtime/HMR responsibility map](../docs/bee-node-hmr.md) and [Packages development brief](../docs/testbed-plan.md); suite links assume the beyond-suite layout. Kernel and Local are existing separate packages. The owner has designated [new development runtime](../local-2026/README.md) as the new Beyond-authored package. These legacy packages are references; exact consolidation APIs and migration remain open, with no merge/rename implementation authorized by this audit.

- Use English for first-party instructions, documentation, comments and explanatory text. Preserve public identities, protocol keys, intentional locale data and functional fixtures; leave vendor/generated files intact.
- Preserve source changes and history. Do not commit, push, reset, publish, deploy or change dependency/package identities without task authorization.
- Keep legacy Engine bootstrap and newer Packages target serving distinct. Engine supplies implementation ESM to modern BEE Node; Packages must serve the target app and HMR.
- Trace actual consumers before changing runtime exports, module identity or HMR semantics. Distinguish source inspection from execution evidence; one transport failure does not establish an architectural failure.
- Read nested AGENTS before editing. Validate proportionately; documentation-only work does not require installations, servers or runtime tests.

Current naming and scope: the new Beyond-authored client runtime will unify Kernel/Local development capabilities for local and cloud servers while preserving production-needed runtime behavior. `local-2026/` is the provisional checkout, not the approved final name. Dev is only under consideration. No rename, new runtime implementation or finalized migration was performed; see [the suite handoff](../local-2026/README.md).
