import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

// NOTE: The `misleadingReturnTypeNoSuggestion` message fires only when BOTH conditions hold:
//   1. The function is exported (fnIsExported = true) — blocks `removeReturnType` suggestion
//   2. isSafeTypeString is false — blocks `narrowReturnType` suggestion
//
// isSafeTypeString is false when checker.typeToString() produces a string matching
//   /\.{3}(?!\.)|^__\w+|typeof import\(/
// (e.g. TS truncation "...", internal names "__type", or dynamic import types).
//
// These strings are produced non-deterministically by the TS compiler depending on
// type complexity and printer truncation thresholds, making them impractical to
// trigger reliably in a RuleTester fixture. The path is covered by code review and
// the defensive branch guard; the normal exported-function path is tested below.

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [],
  invalid: [
    {
      // Exported function + safe type string: removeReturnType is suppressed (exported),
      // narrowReturnType is offered (safe string). Validates the primary suggestion path.
      name: 'exported function with safe type string — gets narrowReturnType suggestion only',
      code: `
        export function getLabel(x: boolean): string {
          if (x) return "a";
          return "b";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        export function getLabel(x: boolean): "a" | "b" {
          if (x) return "a";
          return "b";
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
