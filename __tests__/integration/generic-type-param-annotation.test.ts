import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('generic-type-param-annotation', noMisleadingReturnType, {
  valid: [
    // === Simple T annotation matching inferred ===
    {
      name: 'T | null multi-return with null',
      code: `
      function maybe<T>(x: T): T | null {
        if (Math.random() > 0.5) return x;
        return null;
      }
    `,
    },
    {
      name: 'T | undefined — implicit undefined heuristic',
      code: `
      function first<T>(arr: T[]): T | undefined { return arr[0]; }
    `,
    },
    {
      name: 'T | void — implicit undefined heuristic',
      code: `
      function tryGet<T>(arr: T[]): T | void { if (arr.length > 0) return arr[0]; }
    `,
    },
    {
      name: '{first: T, second: U} matches inferred',
      code: `
      function pair<T, U>(a: T, b: U): { first: T; second: U } {
        return { first: a, second: b };
      }
    `,
    },
    {
      name: 'T extends string, return T',
      code: `
      function echo<T extends string>(x: T): T { return x; }
    `,
    },
    {
      name: 'Promise<T | null> multi-return with null',
      code: `
      async function asyncMaybe<T>(x: T): Promise<T | null> {
        if (Math.random() > 0.5) return x;
        return null;
      }
    `,
    },
    {
      name: 'Array<T> same as T[]',
      code: `
      function toArr<T>(x: T): Array<T> { return [x]; }
    `,
    },
    {
      name: 'Readonly<T> with Object.freeze',
      code: `
      function freeze<T extends object>(x: T): Readonly<T> {
        return Object.freeze(x);
      }
    `,
    },

    // === Unsafe constructs → skip ===
    {
      name: 'conditional type → skip',
      code: `
      function check<T>(x: T): T extends string ? number : boolean {
        return (typeof x === "string" ? 42 : true) as any;
      }
    `,
    },
    {
      name: 'mapped type → skip',
      code: `
      function remap<T extends Record<string, unknown>>(x: T): { [K in keyof T]: boolean } {
        return {} as any;
      }
    `,
    },
    {
      name: 'keyof T → skip',
      code: `
      function getKey<T extends object>(obj: T): keyof T {
        return Object.keys(obj)[0] as keyof T;
      }
    `,
    },
    {
      name: 'T[K] indexed access → skip',
      code: `
      function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
        return obj[key];
      }
    `,
    },
    {
      name: 'conditional in union → skip',
      code: `
      function process<T>(x: T): (T extends string ? "str" : "other") | null {
        return null;
      }
    `,
    },
    // === Utility types with type parameters ===
    {
      name: 'Partial<T> — mapped type internally → skip',
      code: `
      function partial<T extends object>(x: T): Partial<T> {
        return x;
      }
    `,
    },
    {
      name: 'Required<T> — mapped type internally → skip',
      code: `
      function required<T extends object>(x: T): Required<T> {
        return x as Required<T>;
      }
    `,
    },
    {
      name: 'Pick<T, K> — mapped type internally → skip',
      code: `
      function pick<T, K extends keyof T>(obj: T, key: K): Pick<T, K> {
        return { [key]: obj[key] } as Pick<T, K>;
      }
    `,
    },
    {
      name: 'Extract<T, string> — conditional type internally → skip',
      code: `
      function extract<T>(x: T): Extract<T, string> {
        return x as Extract<T, string>;
      }
    `,
    },
    {
      name: 'Exclude<T, null> — conditional type internally → skip',
      code: `
      function excludeNull<T>(x: T): Exclude<T, null> {
        return x as Exclude<T, null>;
      }
    `,
    },

    // === Intersection with type parameter ===
    {
      name: 'T & { id: string } — intersection containing T, no warning when matching',
      code: `
      function withId<T>(x: T): T & { id: string } {
        return { ...x, id: "abc" } as T & { id: string };
      }
    `,
    },

    // === Class-level T + method-level U ===
    {
      name: 'class T + method U, annotation U matches inferred U',
      code: `
      class Container<T> {
        private value!: T;
        transform<U>(fn: (x: T) => U): U { return fn(this.value); }
      }
    `,
    },

    // === Nested generics ===
    {
      name: 'Promise<T[]> matches inferred — async',
      code: `
      async function wrapArr<T>(items: T[]): Promise<T[]> {
        return items;
      }
    `,
    },
    {
      name: 'Map<T, U> annotation matches inferred',
      code: `
      function toMap<T extends string, U>(key: T, val: U): Map<T, U> {
        return new Map([[key, val]]);
      }
    `,
    },
    {
      name: 'Set<T> annotation matches inferred',
      code: `
      function toSet<T>(x: T): Set<T> {
        return new Set([x]);
      }
    `,
    },

    // === Default type parameter ===
    {
      name: 'default type param <T = string>, concrete annotation matches',
      code: `
      function label<T = string>(x: T): string { return String(x); }
    `,
    },

    // === WeakRef<T> ===
    {
      name: 'WeakRef<T> annotation matches inferred',
      code: `
      function weakify<T extends object>(x: T): WeakRef<T> {
        return new WeakRef(x);
      }
    `,
    },

    // === Real-world patterns ===
    {
      name: 'generic wrapper returning same structure — no false positive',
      code: `
      function wrapResponse<T>(data: T): { data: T; status: number } {
        return { data, status: 200 };
      }
    `,
    },
    {
      name: 'generic callback executor — no false positive',
      code: `
      function execute<T>(fn: () => T): T {
        return fn();
      }
    `,
    },
    {
      name: 'generic with multiple constraints, annotation matches',
      code: `
      function merge<T extends object, U extends object>(a: T, b: U): T & U {
        return { ...a, ...b } as T & U;
      }
    `,
    },
  ],
  invalid: [
    {
      name: 'T | null but null never returned',
      code: `
      function unwrap<T>(x: T): T | null { return x; }
    `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
      function unwrap<T>(x: T) { return x; }
    `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
      function unwrap<T>(x: T): T { return x; }
    `,
            },
          ],
        },
      ],
    },

    {
      name: 'T | Error but Error never returned',
      code: `
      function parse<T>(x: T): T | Error { return x; }
    `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
      function parse<T>(x: T) { return x; }
    `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
      function parse<T>(x: T): T { return x; }
    `,
            },
          ],
        },
      ],
    },

    {
      name: 'T | string | number where only T returned',
      code: `
      function box<T>(x: T): T | string | number { return x; }
    `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
      function box<T>(x: T) { return x; }
    `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
      function box<T>(x: T): T { return x; }
    `,
            },
          ],
        },
      ],
    },

    {
      name: 'Promise<T | null> but null never returned async',
      code: `
      async function asyncUnwrap<T>(x: T): Promise<T | null> { return x; }
    `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
      async function asyncUnwrap<T>(x: T) { return x; }
    `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
      async function asyncUnwrap<T>(x: T): Promise<T> { return x; }
    `,
            },
          ],
        },
      ],
    },

    {
      name: 'multi-return T | null | string but only T and null',
      code: `
      function multi<T>(x: T, flag: boolean): T | null | string {
        if (flag) return x;
        return null;
      }
    `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
      function multi<T>(x: T, flag: boolean) {
        if (flag) return x;
        return null;
      }
    `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
      function multi<T>(x: T, flag: boolean): T | null {
        if (flag) return x;
        return null;
      }
    `,
            },
          ],
        },
      ],
    },
  ],
});
