---
'eslint-plugin-no-misleading-return-type': patch
---

fix: detect methods in `export default { ... }` as exported for isolatedDeclarations safety

fix: detect methods in nested exported objects (e.g. `export const c = { nested: { method() {} } }`)

fix: exclude `removeReturnType` suggestion for exported functions to prevent isolatedDeclarations breakage

fix: skip `narrowReturnType` suggestion when `typeToString` produces unparseable output

fix: replace unsafe `as ts.TypeNode` cast with `ts.isTypeNode()` guard
