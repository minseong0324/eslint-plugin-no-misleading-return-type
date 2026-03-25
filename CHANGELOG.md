# eslint-plugin-no-misleading-return-type

## 0.3.0

### Minor Changes

- Align inferred type comparison with TypeScript's actual return type inference by widening single-return literal types via `getBaseTypeOfLiteralType`. Single literal returns (e.g. `(): string { return "idle" }`) no longer trigger warnings since TS infers `string`, not `"idle"`. Multi-return unions and `as const` objects are unchanged. ([#23](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/23))

### Patch Changes

- Inject plugin `meta.version` at build time via tsdown `define` to keep it in sync with package.json automatically ([#24](https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/pull/24))

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
