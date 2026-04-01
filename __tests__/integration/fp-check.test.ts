import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('union-redundancy', noMisleadingReturnType, {
  valid: [
    // === Union redundancy: T | Supertype should NOT warn ===
    {
      name: 'T | string where T extends string — redundant union, not misleading',
      code: `function f<T extends string>(x: T): T | string { return x; }`,
    },
    {
      name: 'T | number where T extends number — redundant union',
      code: `function f<T extends number>(x: T): T | number { return x; }`,
    },
    {
      name: 'T | boolean where T extends true — redundant union',
      code: `function f<T extends true>(x: T): T | boolean { return x; }`,
    },
    {
      name: 'T | object where T extends object — redundant union',
      code: `function f<T extends object>(x: T): T | object { return x; }`,
    },
    // === Legitimate wider annotations (multi-return with all members) ===
    {
      name: 'T | null multi-return — all members returned',
      code: `
        function f<T>(x: T): T | null {
          if (Math.random() > 0.5) return x;
          return null;
        }
      `,
    },
    // === Utility type resolution in inferred type — must NOT warn ===
    {
      name: 'Promise.resolve(x) inferred as Promise<Awaited<T>> — not misleading',
      code: `function f<T>(x: T): Promise<T> { return Promise.resolve(x); }`,
    },
    {
      name: 'map.get(k)! inferred as NonNullable<T> — not misleading',
      code: `function f<T>(m: Map<string, T>, k: string): T { return m.get(k)!; }`,
    },
    {
      name: 'JSON.parse returns any — any contamination skip',
      code: `function f<T>(x: string): T { return JSON.parse(x); }`,
    },
    // === Real-world generic patterns — must NOT warn ===
    {
      name: 'generic wrapper {data:T, ok:boolean}',
      code: `function f<T>(data: T): { data: T; ok: boolean } { return { data, ok: true }; }`,
    },
    {
      name: 'generic callback executor',
      code: `function f<T>(fn: () => T): T { return fn(); }`,
    },
    {
      name: 'generic spread merge T & U',
      code: `function f<T extends object, U extends object>(a: T, b: U): T & U { return { ...a, ...b } as T & U; }`,
    },
    {
      name: 'generic array map U[]',
      code: `function f<T, U>(arr: T[], fn: (x: T) => U): U[] { return arr.map(fn); }`,
    },
    {
      name: 'generic with as assertion',
      code: `function f<T>(x: unknown): T { return x as T; }`,
    },
    {
      name: 'generic returning arr[0]',
      code: `function f<T>(arr: T[]): T { return arr[0]; }`,
    },
    {
      name: 'generic ternary same type',
      code: `function f<T>(x: T, y: T): T { return Math.random() > 0.5 ? x : y; }`,
    },
    {
      name: 'two params return first',
      code: `function f<T, U>(a: T, b: U): T { return a; }`,
    },
    {
      name: 'default type param',
      code: `function f<T = string>(x: T): T { return x; }`,
    },
    {
      name: 'constrained to interface',
      code: `function f<T extends { id: string }>(x: T): T { return x; }`,
    },
    {
      name: 'constrained to Error class',
      code: `function f<T extends Error>(x: T): T { return x; }`,
    },
  ],
  invalid: [
    // === Genuine widening: extra members never returned ===
    {
      name: 'T | null unconstrained, null never returned — should warn',
      code: `function f<T>(x: T): T | null { return x; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function f<T>(x: T) { return x; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function f<T>(x: T): T { return x; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'T | Error unconstrained, Error never returned — should warn',
      code: `function f<T>(x: T): T | Error { return x; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function f<T>(x: T) { return x; }`,
            },
            {
              messageId: 'narrowReturnType',
              output: `function f<T>(x: T): T { return x; }`,
            },
          ],
        },
      ],
    },
  ],
});
