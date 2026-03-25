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
    {
      name: 'single literal return: string matches widened',
      code: `const getStatus = function(): string { return "idle"; };`,
    },
    {
      name: 'single literal return: number matches widened',
      code: `const getCode = function(): number { return 404; };`,
    },
    {
      name: 'single literal return: object method FE matches widened',
      code: `
        const obj = {
          getLabel: function(): string { return "foo"; },
        };
      `,
    },
  ],
  invalid: [
    {
      name: 'multi-return FE: string wider than "idle" | "loading"',
      code: `
        const getStatus = function(x: boolean): string {
          if (x) return "idle";
          return "loading";
        };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        const getStatus = function(x: boolean) {
          if (x) return "idle";
          return "loading";
        };
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        const getStatus = function(x: boolean): "idle" | "loading" {
          if (x) return "idle";
          return "loading";
        };
      `,
            },
          ],
        },
      ],
    },
  ],
});
