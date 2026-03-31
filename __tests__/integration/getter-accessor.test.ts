import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('getter-accessor', noMisleadingReturnType, {
  valid: [
    {
      name: 'getter-only: single literal return widened to string — no warning',
      code: `
        class Foo {
          get label(): string { return "foo"; }
        }
      `,
    },
    {
      name: 'getter-only: annotation matches inferred — no warning',
      code: `
        class Foo {
          get label(): "foo" { return "foo"; }
        }
      `,
    },
    {
      name: 'getter with setter pair: wider annotation — skip (must match setter)',
      code: `
        class Foo {
          private _s = "";
          get status(): string {
            if (this._s === "") return "idle";
            return "active";
          }
          set status(v: string) { this._s = v; }
        }
      `,
    },
    {
      name: 'getter-only: escape hatch void — skip',
      code: `
        class Foo {
          get label(): any { return "foo"; }
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'getter-only: string annotation wider than multi-return literal union',
      code: `
        class Foo {
          private loading = false;
          get status(): string {
            if (this.loading) return "loading";
            return "idle";
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
        class Foo {
          private loading = false;
          get status() {
            if (this.loading) return "loading";
            return "idle";
          }
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        class Foo {
          private loading = false;
          get status(): "loading" | "idle" {
            if (this.loading) return "loading";
            return "idle";
          }
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'getter-only: number annotation wider than literal',
      code: `
        class Foo {
          get code(): number {
            if (Math.random() > 0.5) return 200;
            return 404;
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
        class Foo {
          get code() {
            if (Math.random() > 0.5) return 200;
            return 404;
          }
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        class Foo {
          get code(): 200 | 404 {
            if (Math.random() > 0.5) return 200;
            return 404;
          }
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
