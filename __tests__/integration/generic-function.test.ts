import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('generic-function', noMisleadingReturnType, {
  valid: [
    // === Annotation contains type parameter — now checked (simple T usage) ===
    {
      name: 'annotation T matches inferred T — no warning',
      code: `function identity<T>(x: T): T { return x; }`,
    },
    {
      name: 'annotation T[] matches inferred T[] — no warning',
      code: `function toArray<T>(x: T): T[] { return [x]; }`,
    },
    {
      name: 'annotation Promise<T> matches inferred Promise<T> — no warning',
      code: `async function wrap<T>(x: T): Promise<T> { return x; }`,
    },
    {
      name: 'annotation { value: T } matches inferred — no warning',
      code: `function wrap<T>(x: T): { value: T } { return { value: x }; }`,
    },
    {
      name: 'annotation T | null matches inferred T | null — no warning',
      code: `
        function maybe<T>(x: T): T | null {
          if (Math.random() > 0.5) return x;
          return null;
        }
      `,
    },
    {
      name: 'annotation Map<string, T> matches inferred — no warning',
      code: `
        function toMap<T>(x: T): Map<string, T> {
          return new Map([["key", x]]);
        }
      `,
    },
    {
      name: 'annotation [T, T] matches inferred — no warning',
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

    // === Constraint-based: inferred matches annotation ===
    {
      name: 'T extends {name: string}, returns x.name → concrete string matches',
      code: `
        function getName<T extends { name: string }>(x: T): string {
          return x.name;
        }
      `,
    },

    // === JSON.stringify returns string ===
    {
      name: 'T unconstrained, JSON.stringify returns string → matches annotation',
      code: `
        function serialize<T>(x: T): string {
          return JSON.stringify(x);
        }
      `,
    },

    // === Type assertion in return ===
    {
      name: 'type assertion makes return match annotation',
      code: `
        function toObj<T>(x: T): object {
          return x as object;
        }
      `,
    },

    // === Arrow function with concrete return ===
    {
      name: 'arrow function with concrete annotation matching inferred',
      code: `const len = <T extends string>(x: T): number => x.length;`,
    },

    // === Class method with concrete return ===
    {
      name: 'class method with concrete return type matching',
      code: `
        class Processor<T> {
          count(items: T[]): number {
            return items.length;
          }
        }
      `,
    },

    // === Multiple type params, annotation uses none ===
    {
      name: 'multiple type params, concrete annotation matches',
      code: `
        function compare<T, U>(a: T, b: U): boolean {
          return a === b;
        }
      `,
    },

    // === Conditional expression with concrete types ===
    {
      name: 'generic with conditional expression returning matching concrete type',
      code: `
        function check<T>(x: T): boolean {
          return x != null ? true : false;
        }
      `,
    },

    // === Generic returning result of another function ===
    {
      name: 'generic calling non-generic function with concrete return',
      code: `
        function helper(): number { return 42; }
        function wrapper<T>(x: T): number { return helper(); }
      `,
    },

    // === Annotation with T[K] index access → skip ===
    {
      name: 'annotation with T[K] index access — unsafe construct, skip',
      code: `
        function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
          return obj[key];
        }
      `,
    },

    // === Annotation with keyof T → skip ===
    {
      name: 'annotation with keyof T — unsafe construct, skip',
      code: `
        function getKey<T extends object>(obj: T): keyof T {
          return Object.keys(obj)[0] as keyof T;
        }
      `,
    },

    // === Async generic with concrete string ===
    {
      name: 'async generic with concrete string, single return widened',
      code: `
        async function asyncLabel<T>(x: T): Promise<string> {
          return "done";
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

    // === T extends string, return x: string wider than T's constraint ===
    {
      name: 'T extends string, return x → string wider than constraint',
      code: `function id<T extends string>(x: T): string { return x; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function id<T extends string>(x: T) { return x; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function id<T extends string>(x: T): T { return x; }`,
            },
          ],
        },
      ],
    },

    // === Arrow function with wider annotation ===
    {
      name: 'arrow function: object wider than { value: T }',
      code: `const wrap = <T>(x: T): object => ({ value: x });`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `const wrap = <T>(x: T) => ({ value: x });`,
            },
            {
              messageId: 'narrowReturnType',
              output: `const wrap = <T>(x: T): { value: T; } => ({ value: x });`,
            },
          ],
        },
      ],
    },

    // === Async generic with concrete wider annotation ===
    {
      name: 'async generic: Promise<object> wider than Promise<{ value: T }>',
      code: `
        async function asyncWrap<T>(x: T): Promise<object> {
          return { value: x };
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        async function asyncWrap<T>(x: T) {
          return { value: x };
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        async function asyncWrap<T>(x: T): Promise<{ value: T; }> {
          return { value: x };
        }
      `,
            },
          ],
        },
      ],
    },

    // === Number annotation wider than literal union in generic ===
    {
      name: 'generic with multi-return: number wider than 1 | 2',
      code: `
        function getCode<T>(x: T): number {
          if (Math.random() > 0.5) return 1;
          return 2;
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function getCode<T>(x: T) {
          if (Math.random() > 0.5) return 1;
          return 2;
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        function getCode<T>(x: T): 1 | 2 {
          if (Math.random() > 0.5) return 1;
          return 2;
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
