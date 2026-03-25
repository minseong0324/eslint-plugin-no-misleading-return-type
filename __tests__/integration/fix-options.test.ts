import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [],
  invalid: [
    {
      name: 'fix: suggestion (default) — provides suggestion, no autofix',
      code: `
        function foo(x: boolean): string {
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
        function foo(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function foo(x: boolean): "a" | "b" {
          if (x) return "a";
          return "b";
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix — removes annotation automatically',
      options: [{ fix: 'autofix' }],
      code: `
        function foo(x: boolean): string {
          if (x) return "a";
          return "b";
        }
      `,
      output: `
        function foo(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
    {
      name: 'fix: autofix on exported function — falls back to suggestion for isolatedDeclarations safety',
      options: [{ fix: 'autofix' }],
      code: `
        export function foo(x: boolean): string {
          if (x) return "a";
          return "b";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        export function foo(x: boolean): "a" | "b" {
          if (x) return "a";
          return "b";
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix on exported function expression (export const foo = function()) — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        export const getStatus = function(x: boolean): string {
          if (x) return "idle";
          return "loading";
        };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        export const getStatus = function(x: boolean): "idle" | "loading" {
          if (x) return "idle";
          return "loading";
        };
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix on exported arrow function expression (export const foo = () =>) — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        export const getStatus = (x: boolean): string => {
          if (x) return "idle";
          return "loading";
        };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        export const getStatus = (x: boolean): "idle" | "loading" => {
          if (x) return "idle";
          return "loading";
        };
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: none — reports without any fix',
      options: [{ fix: 'none' }],
      code: `
        function foo(x: boolean): string {
          if (x) return "a";
          return "b";
        }
      `,
      errors: [{ messageId: 'misleadingReturnType' }],
    },

    // ── Indirect export: arrow / function expression ──────────
    {
      name: 'fix: autofix on indirectly exported arrow — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        const getStatus = (x: boolean): string => {
          if (x) return "idle";
          return "loading";
        };
        export { getStatus };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        const getStatus = (x: boolean): "idle" | "loading" => {
          if (x) return "idle";
          return "loading";
        };
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
        const getStatus = function(x: boolean): string {
          if (x) return "idle";
          return "loading";
        };
        export { getStatus };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        const getStatus = function(x: boolean): "idle" | "loading" {
          if (x) return "idle";
          return "loading";
        };
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
          getKey(x: boolean): string {
            if (x) return "foo";
            return "bar";
          }
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        export class Foo {
          getKey(x: boolean): "foo" | "bar" {
            if (x) return "foo";
            return "bar";
          }
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
          getKey(x: boolean): string {
            if (x) return "foo";
            return "bar";
          }
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        export default class {
          getKey(x: boolean): "foo" | "bar" {
            if (x) return "foo";
            return "bar";
          }
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
          getKey(x: boolean): string {
            if (x) return "foo";
            return "bar";
          }
        }
        export { Foo };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        class Foo {
          getKey(x: boolean): "foo" | "bar" {
            if (x) return "foo";
            return "bar";
          }
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
          getKey(x: boolean): string {
            if (x) return "foo";
            return "bar";
          }
        };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        export const Foo = class {
          getKey(x: boolean): "foo" | "bar" {
            if (x) return "foo";
            return "bar";
          }
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
          getKey(x: boolean): string {
            if (x) return "foo";
            return "bar";
          }
        };
        export { Foo };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        const Foo = class {
          getKey(x: boolean): "foo" | "bar" {
            if (x) return "foo";
            return "bar";
          }
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
        function getStatus(x: boolean): string {
          if (x) return "idle";
          return "loading";
        }
        export { getStatus as status };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        function getStatus(x: boolean): "idle" | "loading" {
          if (x) return "idle";
          return "loading";
        }
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
        const getStatus = (x: boolean): string => {
          if (x) return "idle";
          return "loading";
        };
        export { getStatus as status };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        const getStatus = (x: boolean): "idle" | "loading" => {
          if (x) return "idle";
          return "loading";
        };
        export { getStatus as status };
      `,
            },
          ],
        },
      ],
    },

    // ── Export default: anonymous function / arrow ────────────
    {
      name: 'fix: autofix on export default function (anonymous) — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        export default function(x: boolean): string {
          if (x) return "a";
          return "b";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        export default function(x: boolean): "a" | "b" {
          if (x) return "a";
          return "b";
        }
      `,
            },
          ],
        },
      ],
    },

    // ── Object literal method in exported object ─────────────
    {
      name: 'fix: autofix on exported object literal method — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
        export const api = {
          getStatus(x: boolean): string {
            if (x) return "idle";
            return "loading";
          }
        };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
        export const api = {
          getStatus(x: boolean): "idle" | "loading" {
            if (x) return "idle";
            return "loading";
          }
        };
      `,
            },
          ],
        },
      ],
    },

    // ── Export default object literal ─────────────────────────
    {
      name: 'fix: autofix on export default object literal method — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
    export default {
      getStatus(x: boolean): string {
        if (x) return "idle";
        return "loading";
      }
    };
  `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
    export default {
      getStatus(x: boolean): "idle" | "loading" {
        if (x) return "idle";
        return "loading";
      }
    };
  `,
            },
          ],
        },
      ],
    },
    {
      name: 'fix: autofix on nested object method in exported object — falls back to suggestion',
      options: [{ fix: 'autofix' }],
      code: `
    export const api = {
      nested: {
        getStatus(x: boolean): string {
          if (x) return "idle";
          return "loading";
        }
      }
    };
  `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'narrowReturnType',
              output: `
    export const api = {
      nested: {
        getStatus(x: boolean): "idle" | "loading" {
          if (x) return "idle";
          return "loading";
        }
      }
    };
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
      code: `
        function foo(x: boolean): string {
          if (x) return "a";
          return "b";
        }
      `,
      output: `
        function foo(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
    {
      name: 'fix: autofix on non-exported class method — autofix applies normally',
      options: [{ fix: 'autofix' }],
      code: `
        class Foo {
          getKey(x: boolean): string {
            if (x) return "foo";
            return "bar";
          }
        }
      `,
      output: `
        class Foo {
          getKey(x: boolean) {
            if (x) return "foo";
            return "bar";
          }
        }
      `,
      errors: [{ messageId: 'misleadingReturnType' }],
    },
  ],
});
