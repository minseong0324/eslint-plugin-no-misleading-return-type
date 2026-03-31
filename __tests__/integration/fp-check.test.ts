import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('union-redundancy', noMisleadingReturnType, {
  valid: [
    // === Union redundancy: T | Supertype should NOT warn ===
    {
      name: 'T | string where T extends string — redundant union, not misleading',
      code: `function f<T extends string>(x: T): T | string { return x; }`,
    },
    {
      name: 'T | number where T extends number — redundant union',
      code: `function f<T extends number>(x: T): T | number { return x; }`,
    },
    {
      name: 'T | boolean where T extends true — redundant union',
      code: `function f<T extends true>(x: T): T | boolean { return x; }`,
    },
    {
      name: 'T | object where T extends object — redundant union',
      code: `function f<T extends object>(x: T): T | object { return x; }`,
    },
    // === Legitimate wider annotations (multi-return with all members) ===
    {
      name: 'T | null multi-return — all members returned',
      code: `
        function f<T>(x: T): T | null {
          if (Math.random() > 0.5) return x;
          return null;
        }
      `,
    },
  ],
  invalid: [
    // === Genuine widening: extra members never returned ===
    {
      name: 'T | null unconstrained, null never returned — should warn',
      code: `function f<T>(x: T): T | null { return x; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function f<T>(x: T) { return x; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function f<T>(x: T): T { return x; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'T | Error unconstrained, Error never returned — should warn',
      code: `function f<T>(x: T): T | Error { return x; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function f<T>(x: T) { return x; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function f<T>(x: T): T { return x; }`,
            },
          ],
        },
      ],
    },
  ],
});
