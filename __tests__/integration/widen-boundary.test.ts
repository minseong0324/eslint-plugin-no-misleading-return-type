import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

// Design boundary tests: verify getBaseTypeOfLiteralType widening behavior
// Single-return and concise-arrow are widened to match TS return type inference.
// Multi-return unions are kept as-is (TS preserves literal unions).
ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    // === Single literal return — widened type matches annotation ===
    {
      name: 'single literal return: string matches widened "idle"',
      code: `function f(): string { return "idle"; }`,
    },
    {
      name: 'single literal return: number matches widened 404',
      code: `function f(): number { return 404; }`,
    },
    {
      name: 'single literal return: boolean matches widened true',
      code: `function f(): boolean { return true; }`,
    },

    // === Concise arrow — widened ===
    {
      name: 'concise arrow: string matches widened "idle"',
      code: `const f = (): string => "idle";`,
    },
    {
      name: 'concise arrow: number matches widened 42',
      code: `const f = (): number => 42;`,
    },

    // === as const concise arrow — literal matches literal annotation ===
    {
      name: 'as const concise arrow: "hello" annotation matches preserved literal',
      code: `const f = (): "hello" => "hello" as const;`,
    },

    // === Async single return — widened ===
    {
      name: 'async single return: Promise<string> matches widened "hello"',
      code: `async function f(): Promise<string> { return "hello"; }`,
    },
  ],
  invalid: [
    // === Ternary single return — union preserved, not widened ===
    {
      name: 'single return ternary: string wider than "a" | "b"',
      code: `function f(x: boolean): string { return x ? "a" : "b"; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function f(x: boolean) { return x ? "a" : "b"; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function f(x: boolean): "a" | "b" { return x ? "a" : "b"; }`,
            },
          ],
        },
      ],
    },

    // === Multi-return — union preserved, annotation wider ===
    {
      name: 'multi-return: string wider than "idle" | "loading"',
      code: `
        function f(x: boolean): string {
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
        function f(x: boolean) {
          if (x) return "idle";
          return "loading";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function f(x: boolean): "idle" | "loading" {
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
      name: 'multi-return: number wider than 404 | 500',
      code: `
        function f(x: boolean): number {
          if (x) return 404;
          return 500;
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function f(x: boolean) {
          if (x) return 404;
          return 500;
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function f(x: boolean): 404 | 500 {
          if (x) return 404;
          return 500;
        }
      `,
            },
          ],
        },
      ],
    },

    // === as const object — annotation wider than readonly structure ===
    {
      name: 'as const object: Record<string,string> wider than readonly literal map',
      code: `
        function f(): Record<string, string> {
          return { A: "a" } as const;
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function f() {
          return { A: "a" } as const;
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function f(): { readonly A: "a"; } {
          return { A: "a" } as const;
        }
      `,
            },
          ],
        },
      ],
    },

    // === Async multi-return ===
    {
      name: 'async multi-return: Promise<string> wider than Promise<"a" | "b">',
      code: `
        async function f(x: boolean): Promise<string> {
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
        async function f(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        async function f(x: boolean): Promise<"a" | "b"> {
          if (x) return "a";
          return "b";
        }
      `,
            },
          ],
        },
      ],
    },

    // === as const concise arrow — annotation wider than preserved literal ===
    {
      name: 'as const concise arrow: string wider than preserved "hello"',
      code: `const f = (): string => "hello" as const;`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `const f = () => "hello" as const;`,
            },
            {
              messageId: 'narrowReturnType',
              output: `const f = (): "hello" => "hello" as const;`,
            },
          ],
        },
      ],
    },

    // === Object widening (non-literal, unaffected by getBaseTypeOfLiteralType) ===
    {
      name: 'object widening: object wider than { retry: true }',
      code: `function f(): object { return { retry: true }; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function f() { return { retry: true }; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function f(): { retry: boolean; } { return { retry: true }; }`,
            },
          ],
        },
      ],
    },
  ],
});
