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
