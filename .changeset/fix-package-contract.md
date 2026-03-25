---
"eslint-plugin-no-misleading-return-type": patch
---

Move `@typescript-eslint/utils` from peerDependencies to dependencies and add `@typescript-eslint/parser` to peerDependencies to align with ecosystem conventions (runtime import → dep, platform prerequisite → peer). No runtime behavior change — only affects consumer install behavior.
