# eslint-plugin-no-misleading-return-type

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
