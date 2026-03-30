---
'eslint-plugin-no-misleading-return-type': patch
---

Fix tuple element widening false positive

- `[true, "hello"]` returning as `[boolean, string]` no longer triggers a false positive
- Uses `checker.isTupleType()` and `getTypeArguments()` to compare tuple element types directly, avoiding inherited Array prototype method signature mismatches
- Adds `hasWidening` flag to require at least one property with actual literal widening before suppressing warnings
