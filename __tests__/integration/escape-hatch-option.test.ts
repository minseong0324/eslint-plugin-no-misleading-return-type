import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    // Custom escape hatch — annotated type name matches
    {
      name: 'custom escape hatch: Response → skip',
      options: [{ fix: 'suggestion', escapeHatchTypes: ['Response'] }],
      code: `
        class Response { status: number = 200; body: string = ''; }
        function handler(): Response {
          const r = new Response();
          r.status = 200;
          r.body = 'ok';
          return r;
        }
      `,
    },
    // Multiple custom escape hatches
    {
      name: 'multiple custom escape hatches',
      options: [{ fix: 'suggestion', escapeHatchTypes: ['Set', 'Map'] }],
      code: `
        function getItems(): Set<string> {
          return new Set(['a', 'b']);
        }
      `,
    },
    // async with custom escape hatch on inner type
    {
      name: 'async custom escape hatch on inner type → skip',
      options: [{ fix: 'suggestion', escapeHatchTypes: ['Response'] }],
      code: `
        class Response { status: number = 200; body: string = ''; }
        async function handler(): Promise<Response> {
          const r = new Response();
          r.status = 200;
          r.body = 'ok';
          return r;
        }
      `,
    },
    // Default escape hatches still work without option
    {
      name: 'built-in escape hatch any still works',
      code: `function foo(): any { return "idle"; }`,
    },
    // Type alias as custom escape hatch
    {
      name: 'type alias as custom escape hatch → skip',
      options: [{ fix: 'suggestion', escapeHatchTypes: ['ApiResponse'] }],
      code: `
        type ApiResponse = { status: number; data: string };
        function handler(): ApiResponse {
          return { status: 200, data: 'ok' };
        }
      `,
    },
    // Interface as custom escape hatch
    {
      name: 'interface as custom escape hatch → skip',
      options: [{ fix: 'suggestion', escapeHatchTypes: ['ApiResult'] }],
      code: `
        interface ApiResult { status: number; data: string }
        function handler(): ApiResult {
          return { status: 200, data: 'ok' };
        }
      `,
    },
    // Empty array doesn't break anything
    {
      name: 'empty escapeHatchTypes array — no extra escapes',
      options: [{ fix: 'suggestion', escapeHatchTypes: [] }],
      code: `
        function getLabel(): string { return "label"; }
      `,
    },
  ],
  invalid: [
    // Non-matching custom escape hatch — still warns
    {
      name: 'non-matching custom escape hatch → still warns',
      options: [{ fix: 'suggestion', escapeHatchTypes: ['Response'] }],
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
              data: { inferred: '"a" | "b"' },
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
