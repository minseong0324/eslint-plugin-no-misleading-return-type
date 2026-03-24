---
"eslint-plugin-no-misleading-return-type": patch
---

Fix `isExported` guard to detect all export patterns (indirect arrow/function expression exports, exported class methods, class expression methods, renamed exports) preventing `isolatedDeclarations` breakage when using `fix: 'autofix'`
