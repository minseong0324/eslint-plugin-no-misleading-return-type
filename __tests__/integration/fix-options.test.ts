import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [],
  invalid: [
    {
      name: 'fix: suggestion (default) — provides suggestion, no autofix',
      code: `function foo(): string { return "hello"; }`,
      // No top-level output: no autofix applied
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function foo() { return "hello"; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix — removes annotation automatically',
      options: [{ fix: 'autofix' }],
      code: `function foo(): string { return "hello"; }`,
      output: `function foo() { return "hello"; }`,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
    {
      name: 'fix: autofix on exported function — falls back to suggestion for isolatedDeclarations safety',
      options: [{ fix: 'autofix' }],
      code: `export function foo(): string { return "hello"; }`,
      // No top-level output: fallback to suggestion, no autofix
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `export function foo() { return "hello"; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: none — reports without any fix',
      options: [{ fix: 'none' }],
      code: `function foo(): string { return "hello"; }`,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
  ],
});
