---
"eslint-plugin-no-misleading-return-type": patch
---

Skip `override` methods to avoid false positives. Override methods must match parent class return type, so wider annotations are intentional.
