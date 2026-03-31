import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

// Regression tests for TypeScript type system edge cases.
// These patterns all work correctly — tests exist to prevent regressions.

ruleTester.run('type-edge-cases', noMisleadingReturnType, {
  valid: [
    // ── bigint: single return widened ────────────────────────────
    {
      name: 'bigint single return — widened to bigint, matches annotation',
      code: `
        function getBigInt(): bigint {
          return 1n;
        }
      `,
    },

    // ── Enum: annotation matches inferred ────────────────────────
    {
      name: 'enum annotation with single enum member return — widened to Status',
      code: `
        enum Status { Active = "active", Inactive = "inactive" }
        function getStatus(): Status {
          return Status.Active;
        }
      `,
    },

    // ── Type predicate ───────────────────────────────────────────
    {
      name: 'type predicate — return type is boolean, no widening issue',
      code: `
        function isString(x: unknown): x is string {
          return typeof x === "string";
        }
      `,
    },

    // ── Template literal type: annotation matches ────────────────
    {
      name: 'template literal type annotation with matching cast',
      code: `
        function getUrl(): \`https://\${string}\` {
          return "https://example.com" as \`https://\${string}\`;
        }
      `,
    },

    // ── Branded type: annotation is narrower (not wider) ─────────
    {
      name: 'branded type annotation is narrower than inferred — no warning',
      code: `
        type UserId = string & { __brand: "UserId" };
        function getId(): UserId {
          return "abc" as UserId;
        }
      `,
    },

    // ── Enum: exact multi-return match ───────────────────────────
    {
      name: 'enum multi-return with exact enum annotation',
      code: `
        enum Status { Active = "active", Inactive = "inactive" }
        function getStatus(x: boolean): Status {
          if (x) return Status.Active;
          return Status.Inactive;
        }
      `,
    },
  ],
  invalid: [
    // ── string | null: null is NOT suppressed by includesUndefined ─
    {
      name: 'string | null wider than string (single return)',
      code: `
        function getName(): string | null {
          return "hello";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getName() {
          return "hello";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getName(): string {
          return "hello";
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'string | null wider than "a" | "b" (multi-return)',
      code: `
        function getName(x: boolean): string | null {
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
        function getName(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getName(x: boolean): "a" | "b" {
          if (x) return "a";
          return "b";
        }
      `,
            },
          ],
        },
      ],
    },

    // ── bigint: multi-return ─────────────────────────────────────
    {
      name: 'bigint wider than 1n | 2n (multi-return)',
      code: `
        function getBigInt(x: boolean): bigint {
          if (x) return 1n;
          return 2n;
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getBigInt(x: boolean) {
          if (x) return 1n;
          return 2n;
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getBigInt(x: boolean): 1n | 2n {
          if (x) return 1n;
          return 2n;
        }
      `,
            },
          ],
        },
      ],
    },

    // ── Enum: string wider than enum members ─────────────────────
    {
      name: 'string wider than enum member literals (multi-return)',
      code: `
        enum Status { Active = "active", Inactive = "inactive" }
        function getStatus(x: boolean): string {
          if (x) return Status.Active;
          return Status.Inactive;
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        enum Status { Active = "active", Inactive = "inactive" }
        function getStatus(x: boolean) {
          if (x) return Status.Active;
          return Status.Inactive;
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        enum Status { Active = "active", Inactive = "inactive" }
        function getStatus(x: boolean): Status {
          if (x) return Status.Active;
          return Status.Inactive;
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
