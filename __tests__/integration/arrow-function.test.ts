import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    {
      name: 'concise body with matching return type — no warning',
      code: `const getLabel = (): "label" => "label";`,
    },
    {
      name: 'block body with matching return type — no warning',
      code: `const getLabel = (): "label" => { return "label"; };`,
    },
    {
      name: 'concise body without annotation',
      code: `const getLabel = () => "label";`,
    },
    {
      name: 'block body without annotation',
      code: `const getLabel = () => { return "label"; };`,
    },
    {
      name: 'void return',
      code: `const log = (): void => { console.log("hi"); };`,
    },
    {
      name: 'single literal return: concise body string matches widened',
      code: `const getLabel = (): string => "label";`,
    },
    {
      name: 'single literal return: block body string matches widened',
      code: `const getLabel = (): string => { return "label"; };`,
    },
    {
      name: 'single literal return: concise body number matches widened',
      code: `const getCode = (): number => 404;`,
    },
  ],
  invalid: [
    {
      name: 'multi-return block body: string wider than "a" | "b"',
      code: `
        const getLabel = (x: boolean): string => {
          if (x) return "a";
          return "b";
        };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        const getLabel = (x: boolean) => {
          if (x) return "a";
          return "b";
        };
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        const getLabel = (x: boolean): "a" | "b" => {
          if (x) return "a";
          return "b";
        };
      `,
            },
          ],
        },
      ],
    },
  ],
});
