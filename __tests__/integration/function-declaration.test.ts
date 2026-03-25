import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    {
      name: 'annotated type matches inferred type — no warning',
      code: `function getStatus(): "idle" { return "idle"; }`,
    },
    {
      name: 'no return type annotation',
      code: `function getStatus() { return "idle"; }`,
    },
    {
      name: 'void return type',
      code: `function logMessage(): void { console.log("hi"); }`,
    },
    {
      name: 'escape hatch: any',
      code: `function getVal(): any { return "idle"; }`,
    },
    {
      name: 'escape hatch: unknown',
      code: `function getVal(): unknown { return "idle"; }`,
    },
    {
      name: 'overload declaration signature (no body)',
      code: `
        function process(x: string): string;
        function process(x: number): number;
        function process(x: any): any { return x; }
      `,
    },
    {
      name: 'generic function with type parameter',
      code: `function identity<T>(x: T): T { return x; }`,
    },
    {
      name: 'recursive function',
      code: `
        function sum(n: number): number {
          if (n === 0) return 0;
          return n + sum(n - 1);
        }
      `,
    },
    {
      name: 'single literal return: string matches widened "idle"',
      code: `function getStatus(): string { return "idle"; }`,
    },
    {
      name: 'single literal return: number matches widened 404',
      code: `function getCode(): number { return 404; }`,
    },
    {
      name: 'single literal return: boolean matches widened true',
      code: `function isEnabled(): boolean { return true; }`,
    },
  ],
  invalid: [
    {
      name: 'object widening: { retry: true } annotated as object',
      code: `function getConfig(): object { return { retry: true }; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function getConfig() { return { retry: true }; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function getConfig(): { retry: boolean; } { return { retry: true }; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'multi-return: string wider than "idle" | "loading"',
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
            {
              messageId: 'narrowReturnType',
              output: `
        function getStatus(loading: boolean): "loading" | "idle" {
          if (loading) return "loading";
          return "idle";
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
