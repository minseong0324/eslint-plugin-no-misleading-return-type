import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    {
      name: 'overloaded function declaration (2 signatures) → skip',
      code: `
        function foo(x: 'a'): 'a';
        function foo(x: 'b'): 'b';
        function foo(x: 'a' | 'b'): string { return x; }
      `,
    },
    {
      name: 'overloaded function declaration (3 signatures) → skip',
      code: `
        function parse(x: string): string;
        function parse(x: number): number;
        function parse(x: boolean): boolean;
        function parse(x: string | number | boolean): string | number | boolean { return x; }
      `,
    },
    {
      name: 'overloaded class method → skip',
      code: `
        class Foo {
          bar(x: 'a'): 'a';
          bar(x: 'b'): 'b';
          bar(x: 'a' | 'b'): string { return x; }
        }
      `,
    },
    {
      name: 'exported overloaded function → skip',
      code: `
        export function foo(x: 'a'): 'a';
        export function foo(x: 'b'): 'b';
        export function foo(x: 'a' | 'b'): string { return x; }
      `,
    },
    {
      name: 'async overloaded function → skip',
      code: `
        function fetchData(id: string): Promise<string>;
        function fetchData(id: number): Promise<number>;
        async function fetchData(id: string | number): Promise<string | number> {
          return String(id);
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'non-overloaded function with wider return type → still warns',
      code: `
        function getLabel(x: boolean): string {
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
