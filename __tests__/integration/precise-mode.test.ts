import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run(
  'no-misleading-return-type (precise mode)',
  noMisleadingReturnType,
  {
    valid: [
      {
        name: 'precise mode: single return string — annotation matches inference',
        options: [{ fix: 'suggestion', mode: 'precise' }],
        code: `function foo(): string { return "hello"; }`,
      },
      {
        name: 'precise mode: escape hatch void — skipped',
        options: [{ fix: 'suggestion', mode: 'precise' }],
        code: `function foo(): void { console.log("done"); }`,
      },
      {
        name: 'precise mode: no annotation — skipped',
        options: [{ fix: 'suggestion', mode: 'precise' }],
        code: `function foo() { return "hello"; }`,
      },
    ],
    invalid: [
      {
        name: 'precise mode: string wider than "a" | "b"',
        options: [{ fix: 'suggestion', mode: 'precise' }],
        code: `
        function foo(x: boolean): string {
          if (x) return "a";
          return "b";
        }
      `,
        errors: [
          {
            messageId: 'misleadingReturnType',
            suggestions: [
              {
                messageId: 'removeReturnType',
                output: `
        function foo(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
              },
            ],
          },
        ],
      },
      {
        name: 'precise mode: number wider than 1 | 2',
        options: [{ fix: 'suggestion', mode: 'precise' }],
        code: `
        function foo(x: boolean): number {
          if (x) return 1;
          return 2;
        }
      `,
        errors: [
          {
            messageId: 'misleadingReturnType',
            suggestions: [
              {
                messageId: 'removeReturnType',
                output: `
        function foo(x: boolean) {
          if (x) return 1;
          return 2;
        }
      `,
              },
            ],
          },
        ],
      },
    ],
  },
);
