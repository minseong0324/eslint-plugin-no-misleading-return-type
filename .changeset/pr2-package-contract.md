---
"eslint-plugin-no-misleading-return-type": patch
---

Align package contract and documentation with tested TypeScript versions

- peerDependencies: eslint `^9.0.0 || ^10.0.0`, typescript `>=5.0.0 <6.0.0`
- CI: split lint and test jobs; test matrix covers TypeScript 5.4, 5.6, 5.9
- README: rewrite with accurate examples, requirements, and limitations table
