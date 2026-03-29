import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [],
  invalid: [
    {
      name: 'error message includes "hides precise types from callers"',
      code: `
        function getLabel(x: boolean): string {
          if (x) return "a";
          return "b";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          data: {
            annotated: 'string',
            inferred: '"a" | "b"',
          },
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getLabel(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getLabel(x: boolean): "a" | "b" {
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
