import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    {
      name: 'all valid cases pass without warning — function declaration',
      code: `function getStatus(): "idle" { return "idle"; }`,
    },
    {
      name: 'all valid cases pass without warning — arrow function concise',
      code: `const fn = (): "ok" => "ok";`,
    },
    {
      name: 'all valid cases pass without warning — no annotation',
      code: `function noAnnotation() { return 42; }`,
    },
    {
      name: 'all valid cases pass without warning — escape hatch void',
      code: `function run(): void { console.log("x"); }`,
    },
    {
      name: 'all valid cases pass without warning — escape hatch any',
      code: `function getVal(): any { return "x"; }`,
    },
    {
      name: 'single literal return — widened type matches annotation',
      code: `function getStatus(): string { return "idle"; }`,
    },
  ],
  invalid: [
    {
      name: 'multi-return produces warning with correct message — string widening',
      code: `
        function getStatus(x: boolean): string {
          if (x) return "idle";
          return "loading";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getStatus(x: boolean) {
          if (x) return "idle";
          return "loading";
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'message includes annotated and inferred type strings',
      code: `
        function getStatus(x: boolean): string {
          if (x) return "idle";
          return "loading";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          data: {
            annotated: 'string',
            inferred: '"idle" | "loading"',
          },
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getStatus(x: boolean) {
          if (x) return "idle";
          return "loading";
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix options work as configured — default suggestion (multi-return)',
      code: `
        function foo(x: boolean): number {
          if (x) return 42;
          return 99;
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
          if (x) return 42;
          return 99;
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix options work as configured — autofix (multi-return)',
      options: [{ fix: 'autofix' }],
      code: `
        function foo(x: boolean): number {
          if (x) return 42;
          return 99;
        }
      `,
      output: `
        function foo(x: boolean) {
          if (x) return 42;
          return 99;
        }
      `,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
  ],
});
