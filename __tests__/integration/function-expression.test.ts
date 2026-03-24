import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    {
      name: 'function expression without annotation',
      code: `const getStatus = function() { return "idle"; };`,
    },
    {
      name: 'function expression with matching return type',
      code: `const getStatus = function(): "idle" { return "idle"; };`,
    },
  ],
  invalid: [
    {
      name: "function expression: 'idle' annotated as string",
      code: `const getStatus = function(): string { return "idle"; };`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `const getStatus = function() { return "idle"; };`,
            },
          ],
        },
      ],
    },
    {
      name: 'function expression assigned to variable: number literal widening',
      code: `const getCode = function(): number { return 404; };`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `const getCode = function() { return 404; };`,
            },
          ],
        },
      ],
    },
    {
      name: 'object method function expression: string literal widening',
      code: `
        const obj = {
          getLabel: function(): string { return "foo"; },
        };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        const obj = {
          getLabel: function() { return "foo"; },
        };
      `,
            },
          ],
        },
      ],
    },
  ],
});
