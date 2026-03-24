import { after, describe, it } from 'node:test';
import parser from '@typescript-eslint/parser';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';

RuleTester.afterAll = after;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*'],
        defaultProject: 'tsconfig.json',
      },
    },
  },
});

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
          ],
        },
      ],
    },
  ],
});
