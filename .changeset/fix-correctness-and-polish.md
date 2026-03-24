---
"eslint-plugin-no-misleading-return-type": patch
---

Fix correctness bugs and polish docs/package

**Bug fixes:**
- Fix `UnionReduction.Literal` fallback value (`?? 2` → `?? 1`): multi-return functions were silently missing widening warnings due to wrong enum value
- Add `ts.isConstructorDeclaration` guard in `isFunctionLike`: constructor return expressions no longer contaminate the outer function's inferred type
- Fix `includesUndefined` to cover `TypeFlags.Void`: `string | void` annotations no longer produce false positives
- Fix `isExported` to detect `export const foo = function()` and `export const foo = () =>` via VariableDeclarator parent chain; autofix now correctly falls back to suggestion for these forms

**Package:**
- Relax `engines.node` from `>=22.12.0` to `>=20.0.0`
- Add default export to `src/index.ts` for ergonomic `import plugin from '...'` usage

**Docs:**
- Fix `parse(): any` → `parse(s: string): any` in README, README.ko.md, and docs/rules
- Sync README.ko.md with English README
- Update tested TypeScript range to `5.0–5.9`
- Improve setup example to show default import
