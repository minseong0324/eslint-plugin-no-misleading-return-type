import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [],
  invalid: [
    {
      name: 'fix: suggestion (default) — provides suggestion, no autofix',
      code: `function foo(): string { return "hello"; }`,
      // No top-level output: no autofix applied
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function foo() { return "hello"; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix — removes annotation automatically',
      options: [{ fix: 'autofix' }],
      code: `function foo(): string { return "hello"; }`,
      output: `function foo() { return "hello"; }`,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
    {
      name: 'fix: autofix on exported function — falls back to suggestion for isolatedDeclarations safety',
      options: [{ fix: 'autofix' }],
      code: `export function foo(): string { return "hello"; }`,
      // No top-level output: fallback to suggestion, no autofix
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `export function foo() { return "hello"; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix on exported function expression (export const foo = function()) — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `export const getStatus = function(): string { return "idle"; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `export const getStatus = function() { return "idle"; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix on exported arrow function expression (export const foo = () =>) — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `export const getStatus = (): string => "idle";`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `export const getStatus = () => "idle";`,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: none — reports without any fix',
      options: [{ fix: 'none' }],
      code: `function foo(): string { return "hello"; }`,
      errors: [{ messageId: 'misleadingReturnType' }],
    },

    // ── Indirect export: arrow / function expression ──────────
    {
      name: 'fix: autofix on indirectly exported arrow — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        const getStatus = (): string => "idle";
        export { getStatus };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        const getStatus = () => "idle";
        export { getStatus };
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix on indirectly exported function expression — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        const getStatus = function(): string { return "idle"; };
        export { getStatus };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        const getStatus = function() { return "idle"; };
        export { getStatus };
      `,
            },
          ],
        },
      ],
    },

    // ── Direct export class methods ───────────────────────────
    {
      name: 'fix: autofix on exported class method — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        export class Foo {
          getKey(): string { return "foo"; }
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        export class Foo {
          getKey() { return "foo"; }
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix on export default class method — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        export default class {
          getKey(): string { return "foo"; }
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        export default class {
          getKey() { return "foo"; }
        }
      `,
            },
          ],
        },
      ],
    },

    // ── Indirect export class methods ─────────────────────────
    {
      name: 'fix: autofix on indirectly exported class method — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        class Foo {
          getKey(): string { return "foo"; }
        }
        export { Foo };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        class Foo {
          getKey() { return "foo"; }
        }
        export { Foo };
      `,
            },
          ],
        },
      ],
    },

    // ── Class expression methods ──────────────────────────────
    {
      name: 'fix: autofix on exported class expression method — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        export const Foo = class {
          getKey(): string { return "foo"; }
        };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        export const Foo = class {
          getKey() { return "foo"; }
        };
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix on indirectly exported class expression method — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        const Foo = class {
          getKey(): string { return "foo"; }
        };
        export { Foo };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        const Foo = class {
          getKey() { return "foo"; }
        };
        export { Foo };
      `,
            },
          ],
        },
      ],
    },

    // ── Renamed exports (export { foo as bar }) ───────────────
    {
      name: 'fix: autofix on renamed export function — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        function getStatus(): string { return "idle"; }
        export { getStatus as status };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getStatus() { return "idle"; }
        export { getStatus as status };
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix on renamed export arrow — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        const getStatus = (): string => "idle";
        export { getStatus as status };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        const getStatus = () => "idle";
        export { getStatus as status };
      `,
            },
          ],
        },
      ],
    },

    // ── Non-exported: autofix still applies ───────────────────
    {
      name: 'fix: autofix on non-exported function — autofix applies normally',
      options: [{ fix: 'autofix' }],
      code: `function foo(): string { return "hello"; }`,
      output: `function foo() { return "hello"; }`,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
    {
      name: 'fix: autofix on non-exported class method — autofix applies normally',
      options: [{ fix: 'autofix' }],
      code: `
        class Foo {
          getKey(): string { return "foo"; }
        }
      `,
      output: `
        class Foo {
          getKey() { return "foo"; }
        }
      `,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
  ],
});
