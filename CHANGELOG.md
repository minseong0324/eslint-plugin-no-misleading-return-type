# eslint-plugin-no-misleading-return-type

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
