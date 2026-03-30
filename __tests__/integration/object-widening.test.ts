import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

// Object widening boundary cases.
// Documents what the rule actually does with object types — some cases are blocked by
// TypeScript contextual typing (same limitation as async Promise.resolve cases).
ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    // Annotation matches inferred exactly — no warning expected
    {
      name: 'exact object literal type annotation matches inferred',
      code: `function f(): { type: "idle" } { return { type: "idle" }; }`,
    },
    {
      name: 'object annotation with typed variable — no narrowing possible',
      code: `
        function f(): { type: string } {
          const v: { type: string } = { type: "idle" };
          return v;
        }
      `,
    },

    // Annotation is not strictly wider (incomparable shapes) — no warning
    {
      name: 'annotation has extra property not in inferred — incomparable, no warning',
      // { type: string; extra: number } vs { type: "idle" }: neither is assignable to the other
      code: `function f(): { type: string; extra: number } { return { type: "idle", extra: 1 }; }`,
    },

    // Contextual typing limitation: when annotation has required string properties,
    // TypeScript widens the object literal's string values to match the annotation.
    // { type: "idle" } inside a function annotated { type: string } gets inferred as
    // { type: string } — making the annotation and inferred equal. Cannot detect in v1.
    {
      name: 'contextual typing limitation: { type: string } annotation widens "idle" to string in object literal',
      code: `function f(): { type: string } { return { type: "idle" }; }`,
    },
    {
      name: 'contextual typing limitation: nested object — inner string literal widened by context',
      code: `function f(): { meta: { status: string } } { return { meta: { status: "ok" } }; }`,
    },

    // Object property literal widening: without `as const`, TypeScript widens boolean/number
    // literal properties in object literals (e.g., `false` → `boolean`).
    // `checker.getTypeAtLocation()` may return the narrow type, but the rule must skip
    // these cases to avoid false positives.
    {
      name: 'boolean property widening: { isSuccess: boolean } matches { isSuccess: false } without as const (single return)',
      code: `
        type Result = { isSuccess: boolean; message: string };
        function f(): Result { return { isSuccess: false, message: "error" }; }
      `,
    },
    {
      name: 'boolean property widening: { isSuccess: boolean } matches { isSuccess: false } without as const (multi return)',
      code: `
        type Result = { isSuccess: boolean; message: string };
        function f(x: boolean): Result {
          if (x) return { isSuccess: false, message: "fail" };
          return { isSuccess: false, message: "error" };
        }
      `,
    },
    {
      name: 'number property widening: { code: number } matches { code: 404 } without as const',
      code: `
        type Response = { code: number; msg: string };
        function f(): Response { return { code: 404, msg: "not found" }; }
      `,
    },
    {
      name: 'nested object property widening: inner boolean widened without as const',
      code: `
        type Outer = { meta: { active: boolean } };
        function f(): Outer { return { meta: { active: true } }; }
      `,
    },
    {
      name: 'async function: object property widening in Promise',
      code: `
        type Result = { ok: boolean; data: string };
        async function f(): Promise<Result> { return { ok: true, data: "hi" }; }
      `,
    },
  ],
  invalid: [
    // Optional property: TypeScript does NOT contextually widen the literal here
    // because the optional property doesn't impose a strict contextual type on the value.
    // { type: "idle" } is assignable to { type?: string } but not vice versa → warns.
    {
      name: 'optional property annotation { type?: string } wider than inferred { type: "idle" }',
      code: `function f(): { type?: string } { return { type: "idle" }; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function f() { return { type: "idle" }; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function f(): { type: string; } { return { type: "idle" }; }`,
            },
          ],
        },
      ],
    },

    // as const assertion: object property widening is NOT applied — literals are preserved.
    // The rule MUST still warn when as const is used, because the narrow types are intentional.
    {
      name: 'as const object with boolean literal STILL warns (not skipped by property widening)',
      code: `
        type Result = { isSuccess: boolean; message: string };
        function f(): Result { return { isSuccess: false, message: "error" } as const; }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        type Result = { isSuccess: boolean; message: string };
        function f() { return { isSuccess: false, message: "error" } as const; }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        type Result = { isSuccess: boolean; message: string };
        function f(): { readonly isSuccess: false; readonly message: "error"; } { return { isSuccess: false, message: "error" } as const; }
      `,
            },
          ],
        },
      ],
    },

    // as const assertion overrides contextual typing — literals are preserved.
    // This is the README representative example: Record<string, string> widens an as const map.
    {
      name: 'Record<string, string> annotated, as const error-message map returned — inferred has literal values',
      code: `
        function getErrorMessages(): Record<string, string> {
          return {
            INVALID_TOKEN: 'Please log in again.',
            RATE_LIMITED: 'Too many requests. Try again later.',
            NETWORK_ERROR: 'Check your network connection.',
          } as const;
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getErrorMessages() {
          return {
            INVALID_TOKEN: 'Please log in again.',
            RATE_LIMITED: 'Too many requests. Try again later.',
            NETWORK_ERROR: 'Check your network connection.',
          } as const;
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getErrorMessages(): { readonly INVALID_TOKEN: "Please log in again."; readonly RATE_LIMITED: "Too many requests. Try again later."; readonly NETWORK_ERROR: "Check your network connection."; } {
          return {
            INVALID_TOKEN: 'Please log in again.',
            RATE_LIMITED: 'Too many requests. Try again later.',
            NETWORK_ERROR: 'Check your network connection.',
          } as const;
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
