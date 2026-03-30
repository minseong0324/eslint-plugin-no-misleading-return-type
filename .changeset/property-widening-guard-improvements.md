---
'eslint-plugin-no-misleading-return-type': patch
---

Fix additional false positives in object property literal widening guard

- Tuple element widening: `[true, "hello"]` no longer warns against `[boolean, string]`
- Null in union property: `{ data: null }` no longer warns against `{ data: string | null }`
- Guard optional property edge case: `{ type?: string }` correctly warns against `{ type: "idle" }`
