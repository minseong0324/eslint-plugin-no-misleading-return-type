import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('generic-function', noMisleadingReturnType, {
  valid: [
    // === Annotation contains type parameter → skip (preserved behavior) ===
    {
      name: 'annotation is T → skip',
      code: `function identity<T>(x: T): T { return x; }`,
    },
    {
      name: 'annotation is T[] → skip',
      code: `function toArray<T>(x: T): T[] { return [x]; }`,
    },
    {
      name: 'annotation is Promise<T> → skip',
      code: `async function wrap<T>(x: T): Promise<T> { return x; }`,
    },
    {
      name: 'annotation is { value: T } → skip',
      code: `function wrap<T>(x: T): { value: T } { return { value: x }; }`,
    },
    {
      name: 'annotation is T | null → skip',
      code: `
        function maybe<T>(x: T): T | null {
          if (Math.random() > 0.5) return x;
          return null;
        }
      `,
    },
    {
      name: 'annotation is Map<string, T> → skip',
      code: `
        function toMap<T>(x: T): Map<string, T> {
          return new Map([["key", x]]);
        }
      `,
    },
    {
      name: 'annotation is [T, T] → skip',
      code: `function pair<T>(x: T): [T, T] { return [x, x]; }`,
    },

    // === Concrete annotation, inferred matches → no warning ===
    {
      name: 'concrete string matches String(x)',
      code: `function toString<T>(x: T): string { return String(x); }`,
    },
    {
      name: 'concrete number matches .length',
      code: `function getLength<T extends string>(x: T): number { return x.length; }`,
    },
    {
      name: 'concrete boolean matches typeof check',
      code: `function isString<T>(x: T): boolean { return typeof x === "string"; }`,
    },
    {
      name: 'concrete string matches single literal return (widened)',
      code: `function label<T>(x: T): string { return "fixed"; }`,
    },
    {
      name: 'concrete string[] matches Object.keys',
      code: `
        function getKeys<T extends Record<string, unknown>>(obj: T): string[] {
          return Object.keys(obj);
        }
      `,
    },

    // === Escape hatches still work ===
    {
      name: 'concrete escape hatch: any',
      code: `function wrap<T>(x: T): any { return { value: x }; }`,
    },
    {
      name: 'concrete escape hatch: unknown',
      code: `function wrap<T>(x: T): unknown { return { value: x }; }`,
    },
    {
      name: 'concrete escape hatch: void',
      code: `function log<T>(x: T): void { console.log(x); }`,
    },
    {
      name: 'concrete escape hatch: never',
      code: `function fail<T>(x: T): never { throw new Error(); }`,
    },

    // === Multiple type parameters, annotation concrete ===
    {
      name: 'two type params, concrete return matches',
      code: `function count<T, U>(a: T, b: U): number { return 2; }`,
    },

    // === Generic with constraint, concrete annotation matches ===
    {
      name: 'T extends object, concrete number return',
      code: `
        function size<T extends object>(obj: T): number {
          return Object.keys(obj).length;
        }
      `,
    },

    // === Object literal property widening (without as const) ===
    {
      name: 'concrete object annotation, property widening without as const → no warning',
      code: `
        function getConfig<T>(x: T): { enabled: boolean } {
          return { enabled: true };
        }
      `,
    },
  ],
  invalid: [
    // === Concrete annotation wider than inferred ===
    {
      name: 'object annotation wider than { value: T }',
      code: `function wrap<T>(x: T): object { return { value: x }; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function wrap<T>(x: T) { return { value: x }; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function wrap<T>(x: T): { value: T; } { return { value: x }; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'multi-return: object annotation wider than { a: T } | { b: T }',
      code: `
        function process<T>(x: T, flag: boolean): object {
          if (flag) return { a: x };
          return { b: x };
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function process<T>(x: T, flag: boolean) {
          if (flag) return { a: x };
          return { b: x };
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function process<T>(x: T, flag: boolean): { a: T; } | { b: T; } {
          if (flag) return { a: x };
          return { b: x };
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'concrete string wider than T (T extends specific literal union)',
      code: `
        function upcast<T extends "a" | "b">(x: T): string {
          return x;
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function upcast<T extends "a" | "b">(x: T) {
          return x;
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function upcast<T extends "a" | "b">(x: T): "a" | "b" {
          return x;
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'multi-return with concrete annotation: string wider than "a" | "b" (T unused in return)',
      code: `
        function getLabel<T>(x: T): string {
          if (Math.random() > 0.5) return "a";
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
        function getLabel<T>(x: T) {
          if (Math.random() > 0.5) return "a";
          return "b";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getLabel<T>(x: T): "a" | "b" {
          if (Math.random() > 0.5) return "a";
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
