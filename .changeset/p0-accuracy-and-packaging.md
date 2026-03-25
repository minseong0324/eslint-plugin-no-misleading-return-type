---
"eslint-plugin-no-misleading-return-type": minor
---

Improve type analysis accuracy and add `PromiseLike<T>` support

- Deepen `containsAny` traversal to detect `any` inside object properties, nested objects, and index signatures with cycle guard for recursive types
- Fix `includesUndefined` to recurse into intersection types (consistent with `containsAny` pattern)
- Support `PromiseLike<T>` annotations in async functions (previously only `Promise<T>` was unwrapped)
- Remove `src` from published `files` to reduce package size
- Fix untranslated English text in Korean README
- Add unit tests for `includesUndefined` helper
- Add integration tests for `PromiseLike`, async void union heuristic, and export default anonymous function
