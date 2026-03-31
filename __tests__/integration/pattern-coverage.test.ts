import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('pattern-coverage', noMisleadingReturnType, {
  valid: [
    // switch/case
    {
      name: 'switch/case: annotation matches exhaustive literal union',
      code: `
        function getLabel(status: 0 | 1 | 2): "off" | "on" | "standby" {
          switch (status) {
            case 0: return "off";
            case 1: return "on";
            case 2: return "standby";
          }
        }
      `,
    },
    {
      name: 'switch/case: single return widened to string — no warning',
      code: `
        function getLabel(status: number): string {
          switch (status) {
            default: return "unknown";
          }
        }
      `,
    },

    // nested ternary
    {
      name: 'nested ternary: annotation matches inferred union',
      code: `
        function getLabel(a: boolean, b: boolean): "x" | "y" | "z" {
          return a ? "x" : b ? "y" : "z";
        }
      `,
    },

    // satisfies without as const (no effect on type)
    {
      name: 'satisfies without as const: single return widened to string — no warning',
      code: `
        function f(): string { return ("idle" satisfies string); }
      `,
    },
  ],
  invalid: [
    // switch/case
    {
      name: 'switch/case: string annotation wider than literal union',
      code: `
        function getLabel(status: 0 | 1): string {
          switch (status) {
            case 0: return "off";
            case 1: return "on";
          }
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getLabel(status: 0 | 1) {
          switch (status) {
            case 0: return "off";
            case 1: return "on";
          }
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getLabel(status: 0 | 1): "off" | "on" {
          switch (status) {
            case 0: return "off";
            case 1: return "on";
          }
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'switch/case with default: string annotation wider than literal union',
      code: `
        function getLabel(status: number): string {
          switch (status) {
            case 0: return "off";
            case 1: return "on";
            default: return "unknown";
          }
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getLabel(status: number) {
          switch (status) {
            case 0: return "off";
            case 1: return "on";
            default: return "unknown";
          }
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getLabel(status: number): "off" | "on" | "unknown" {
          switch (status) {
            case 0: return "off";
            case 1: return "on";
            default: return "unknown";
          }
        }
      `,
            },
          ],
        },
      ],
    },

    // nested ternary
    {
      name: 'nested ternary: string annotation wider than inferred "x" | "y" | "z"',
      code: `
        function getLabel(a: boolean, b: boolean): string {
          return a ? "x" : b ? "y" : "z";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getLabel(a: boolean, b: boolean) {
          return a ? "x" : b ? "y" : "z";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getLabel(a: boolean, b: boolean): "x" | "y" | "z" {
          return a ? "x" : b ? "y" : "z";
        }
      `,
            },
          ],
        },
      ],
    },

    // single ternary with two branches is multi-return
    {
      name: 'single ternary: string annotation wider than inferred "a" | "b"',
      code: `
        function getLabel(x: boolean): string {
          return x ? "a" : "b";
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
          return x ? "a" : "b";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getLabel(x: boolean): "a" | "b" {
          return x ? "a" : "b";
        }
      `,
            },
          ],
        },
      ],
    },

    // satisfies + as const
    {
      name: 'satisfies + as const: string annotation wider than literal',
      code: `
        function f(): string { return ("idle" as const) satisfies string; }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function f() { return ("idle" as const) satisfies string; }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function f(): "idle" { return ("idle" as const) satisfies string; }
      `,
            },
          ],
        },
      ],
    },
  ],
});
