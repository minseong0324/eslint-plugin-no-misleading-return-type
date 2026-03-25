---
"eslint-plugin-no-misleading-return-type": minor
---

Align inferred type comparison with TypeScript's actual return type inference by widening single-return literal types via `getBaseTypeOfLiteralType`. Single literal returns (e.g. `(): string { return "idle" }`) no longer trigger warnings since TS infers `string`, not `"idle"`. Multi-return unions and `as const` objects are unchanged.
