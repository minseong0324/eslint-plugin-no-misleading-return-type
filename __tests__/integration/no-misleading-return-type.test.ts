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
  ],
  invalid: [
    {
      name: 'all invalid cases produce warning with correct message — string widening',
      code: `function getStatus(): string { return "idle"; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function getStatus() { return "idle"; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'message includes annotated and inferred type strings',
      code: `function getStatus(): string { return "idle"; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          data: {
            annotated: 'string',
            inferred: '"idle"',
          },
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function getStatus() { return "idle"; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'message truncates long type strings',
      code: `
        function getVal(): string {
          return "short";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          data: {
            annotated: 'string',
            inferred: '"short"',
          },
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getVal() {
          return "short";
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix options work as configured — default suggestion',
      code: `function foo(): number { return 42; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function foo() { return 42; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'fix options work as configured — autofix',
      options: [{ fix: 'autofix' }],
      code: `function foo(): number { return 42; }`,
      output: `function foo() { return 42; }`,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
  ],
});
