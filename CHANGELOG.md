# eslint-plugin-no-misleading-return-type

## 0.7.3

### Patch Changes

- refactor: deduplicate async/sync comparison logic in Phase 5 ([#74](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/74))

- fix: detect as const inside satisfies expressions ([#71](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/71))

## 0.7.2

### Patch Changes

- Fix tuple element widening false positive ([#68](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/68))

  - `[true, "hello"]` returning as `[boolean, string]` no longer triggers a false positive
  - Uses `checker.isTupleType()` and `getTypeArguments()` to compare tuple element types directly, avoiding inherited Array prototype method signature mismatches
  - Adds `hasWidening` flag to require at least one property with actual literal widening before suppressing warnings

## 0.7.1

### Patch Changes

- Fix false positives for object literal returns with boolean/number literal properties without `as const` ([#65](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/65))

## 0.7.0

### Minor Changes

- Add `strict` (error severity) and `autofix` (warn + autofix) config presets alongside existing `recommended`. ([#54](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/54))

### Patch Changes

- Improve error message to explain impact on callers while keeping actionable guidance. ([#55](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/55))

- Skip overloaded function implementations to avoid false positives. Overload implementations intentionally use wider return types to cover all signatures. ([#47](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/47))

- Skip `override` methods to avoid false positives. Override methods must match parent class return type, so wider annotations are intentional. ([#48](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/48))

## 0.6.2

### Patch Changes

- Fix `as const` return widening for block body, angle bracket (`<const>`), and parenthesized forms. Previously only concise arrow `as const` was detected. ([#46](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/46))

## 0.6.1

### Patch Changes

- Extract `containsAny` and `collectReturnTypes` from rule closure into standalone helper modules for improved testability. No behavioral changes. ([#44](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/44))

## 0.6.0

### Minor Changes

- fix: preserve PromiseLike wrapper name in narrow suggestion instead of always using Promise ([#38](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/38))

  fix: unwrap PromiseLike (not just Promise) on inferred side for async function comparison

  feat: detect single-return union expressions (e.g. ternary) as literal unions instead of widening

  feat: detect `as const` concise arrow returns as literal types instead of widening

  feat: detect exported object literal methods for isolatedDeclarations safety

  feat: detect `export =` assignments for isolatedDeclarations safety

  refactor: hoist PROMISE_NAMES to module scope to avoid per-function allocation

### Patch Changes

- fix: detect methods in `export default { ... }` as exported for isolatedDeclarations safety ([#41](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/41))

  fix: detect methods in nested exported objects (e.g. `export const c = { nested: { method() {} } }`)

  fix: exclude `removeReturnType` suggestion for exported functions to prevent isolatedDeclarations breakage

  fix: skip `narrowReturnType` suggestion when `typeToString` produces unparseable output

  fix: replace unsafe `as ts.TypeNode` cast with `ts.isTypeNode()` guard

## 0.5.0

### Minor Changes

- Add "narrow return type" suggestion that replaces annotation with inferred type ([#37](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/37))

### Patch Changes

- Extract internal TS `getUnionType` API call into `createUnionType` helper for maintainability ([#31](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/31))

- Extract `isExported` detection logic into dedicated helper module for maintainability ([#32](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/32))

- Update project description to accurately reflect approximation-based type analysis ([#30](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/30))

## 0.4.0

### Minor Changes

- Improve type analysis accuracy and add `PromiseLike<T>` support ([#28](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/28))

  - Deepen `containsAny` traversal to detect `any` inside object properties, nested objects, and index signatures with cycle guard for recursive types
  - Fix `includesUndefined` to recurse into intersection types (consistent with `containsAny` pattern)
  - Support `PromiseLike<T>` annotations in async functions (previously only `Promise<T>` was unwrapped)
  - Remove `src` from published `files` to reduce package size
  - Fix untranslated English text in Korean README
  - Add unit tests for `includesUndefined` helper
  - Add integration tests for `PromiseLike`, async void union heuristic, and export default anonymous function

## 0.3.1

### Patch Changes

- Move `@typescript-eslint/utils` from peerDependencies to dependencies and add `@typescript-eslint/parser` to peerDependencies to align with ecosystem conventions (runtime import → dep, platform prerequisite → peer). No runtime behavior change — only affects consumer install behavior. ([#26](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/26))

## 0.3.0

### Minor Changes

- Align inferred type comparison with TypeScript's actual return type inference by widening single-return literal types via `getBaseTypeOfLiteralType`. Single literal returns (e.g. `(): string { return "idle" }`) no longer trigger warnings since TS infers `string`, not `"idle"`. Multi-return unions and `as const` objects are unchanged. ([#23](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/23))

### Patch Changes

- Read plugin `meta.version` from package.json via `createRequire` to keep it in sync automatically ([#24](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/24))

## 0.2.0

### Minor Changes

- Add `meta` and `configs.recommended` exports for ESLint flat config support ([#19](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/19))

### Patch Changes

- Fix `isExported` guard to detect all export patterns (indirect arrow/function expression exports, exported class methods, class expression methods, renamed exports) preventing `isolatedDeclarations` breakage when using `fix: 'autofix'` ([#17](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/17))

- Add explicit `Options` and `MessageIds` type parameters to `createRule` and simplify generator guard ([#18](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/18))

## 0.1.2

### Patch Changes

- Fix correctness bugs and polish docs/package ([#15](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/15))

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

## 0.1.1

### Patch Changes

- Fix async comparison to correctly handle Promise-returning expressions ([#5](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/5))

- Align package contract and documentation with tested TypeScript versions ([#7](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/7))

  - peerDependencies: eslint `^9.0.0 || ^10.0.0`, typescript `>=5.0.0 <6.0.0`
  - CI: split lint and test jobs; test matrix covers TypeScript 5.4, 5.6, 5.9
  - README: rewrite with accurate examples, requirements, and limitations table

## 0.1.0

### Minor Changes

- first release ([#1](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/1))
