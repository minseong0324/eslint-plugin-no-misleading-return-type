---
"eslint-plugin-no-misleading-return-type": patch
---

Skip overloaded function implementations to avoid false positives. Overload implementations intentionally use wider return types to cover all signatures.
