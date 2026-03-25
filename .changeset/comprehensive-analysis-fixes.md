---
'eslint-plugin-no-misleading-return-type': minor
---

fix: preserve PromiseLike wrapper name in narrow suggestion instead of always using Promise

fix: unwrap PromiseLike (not just Promise) on inferred side for async function comparison

feat: detect single-return union expressions (e.g. ternary) as literal unions instead of widening

feat: detect `as const` concise arrow returns as literal types instead of widening

feat: detect exported object literal methods for isolatedDeclarations safety

feat: detect `export =` assignments for isolatedDeclarations safety

refactor: hoist PROMISE_NAMES to module scope to avoid per-function allocation
