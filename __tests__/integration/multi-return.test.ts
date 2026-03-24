import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    {
      name: "multiple returns: 'idle' | 'loading' annotated, inferred 'idle' | 'loading'",
      code: `
        function getStatus(loading: boolean): "idle" | "loading" {
          if (loading) return "loading";
          return "idle";
        }
      `,
    },
    {
      name: 'multiple returns: void function (no returns)',
      code: `
        function logAll(items: string[]): void {
          items.forEach(item => console.log(item));
        }
      `,
    },
  ],
  invalid: [
    {
      name: "multiple returns: string annotated, inferred 'idle' | 'loading'",
      code: `
        function getStatus(loading: boolean): string {
          if (loading) return "loading";
          return "idle";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getStatus(loading: boolean) {
          if (loading) return "loading";
          return "idle";
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'multiple returns: number annotated, inferred 404 | 500',
      code: `
        function getErrorCode(serverError: boolean): number {
          if (serverError) return 500;
          return 404;
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getErrorCode(serverError: boolean) {
          if (serverError) return 500;
          return 404;
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'multiple returns: object annotated, inferred { a: string } | { b: number }',
      code: `
        function getData(flag: boolean): object {
          if (flag) return { a: "hello" };
          return { b: 42 };
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getData(flag: boolean) {
          if (flag) return { a: "hello" };
          return { b: 42 };
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
