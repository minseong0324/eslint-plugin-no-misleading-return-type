import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    {
      name: 'block body: return "idle" as const with ": "idle"" annotation — no warning',
      code: `function getStatus(): "idle" { return "idle" as const; }`,
    },
    {
      name: 'block body: return <const>"idle" with ": "idle"" annotation — no warning',
      code: `function getStatus(): "idle" { return <const>"idle"; }`,
    },
    {
      name: 'block body: return ("idle" as const) parenthesized with ": "idle"" annotation — no warning',
      code: `function getStatus(): "idle" { return ("idle" as const); }`,
    },
    {
      name: 'concise arrow: (): "idle" => "idle" as const — existing behavior preserved',
      code: `const getStatus = (): "idle" => "idle" as const;`,
    },
    {
      name: 'concise arrow: (): "idle" => ("idle" as const) parenthesized — no warning',
      code: `const getStatus = (): "idle" => ("idle" as const);`,
    },
    {
      name: 'multi-return where one has as const — widening still skipped for multi-return',
      code: `
        function getStatus(x: boolean): "idle" | "loading" {
          if (x) return "idle" as const;
          return "loading";
        }
      `,
    },
    // Nested parentheses
    {
      name: 'block body: return (("idle" as const)) double-parenthesized — no warning',
      code: `function getStatus(): "idle" { return (("idle" as const)); }`,
    },
    // Object literal as const with matching annotation
    {
      name: 'block body: return { x: 1 } as const with matching readonly annotation — no warning',
      code: `function getConfig(): { readonly x: 1 } { return { x: 1 } as const; }`,
    },
    // as const on variable (no narrowing effect)
    {
      name: 'block body: return someVar as const — variable type unchanged, no false positive',
      code: `function getStatus(): string { const s: string = "idle"; return s as const; }`,
    },
  ],
  invalid: [
    {
      name: 'block body: return "idle" as const with ": string" annotation — should warn',
      code: `function getStatus(): string { return "idle" as const; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function getStatus() { return "idle" as const; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function getStatus(): "idle" { return "idle" as const; }`,
            },
          ],
        },
      ],
    },
    // Object literal as const with wider annotation
    {
      name: 'block body: return { x: 1 } as const with wider { x: number } annotation — warns',
      code: `function getConfig(): { x: number } { return { x: 1 } as const; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function getConfig() { return { x: 1 } as const; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function getConfig(): { readonly x: 1; } { return { x: 1 } as const; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'concise arrow: (): string => "idle" as const — should warn',
      code: `const getStatus = (): string => "idle" as const;`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `const getStatus = () => "idle" as const;`,
            },
            {
              messageId: 'narrowReturnType',
              output: `const getStatus = (): "idle" => "idle" as const;`,
            },
          ],
        },
      ],
    },
  ],
});
