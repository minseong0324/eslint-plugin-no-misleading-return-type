---
"eslint-plugin-no-misleading-return-type": patch
---

Fix `as const` return widening for block body, angle bracket (`<const>`), and parenthesized forms. Previously only concise arrow `as const` was detected.
