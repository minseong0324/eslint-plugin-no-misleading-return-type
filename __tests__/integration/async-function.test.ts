import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    {
      name: 'Promise inner type is equivalent',
      code: `async function greet(): Promise<"hello"> { return "hello"; }`,
    },
    {
      name: 'Promise<void> — escape hatch after unwrap',
      code: `async function run(): Promise<void> { console.log("hi"); }`,
    },
    {
      name: 'Promise<any> — escape hatch after unwrap',
      code: `async function fetch(): Promise<any> { return "data"; }`,
    },
    {
      name: 'async function with matching inner type: Promise<string> and returns string variable',
      code: `
        async function getName(): Promise<string> {
          const name: string = "Alice";
          return name;
        }
      `,
    },
    {
      name: 'async with Promise<number | undefined> and implicit undefined path → skip (heuristic)',
      code: `
        async function findItem(id: number): Promise<number | undefined> {
          if (id > 0) return id;
        }
      `,
    },
    {
      name: 'return Promise.resolve with matching annotation: Promise<"hello"> annotated, Promise.resolve("hello") returned',
      code: `async function greet(): Promise<"hello"> { return Promise.resolve("hello"); }`,
    },
    // Contextual typing limitation: when the function has Promise<string> annotation,
    // TypeScript contextually widens Promise.resolve("hello") to Promise<string>,
    // making the literal "hello" invisible to getTypeAtLocation. Cannot detect in v1.
    {
      name: 'contextual typing limitation: Promise<string> annotated, Promise.resolve("hello") returned — literal hidden by context',
      code: `async function greet(): Promise<string> { return Promise.resolve("hello"); }`,
    },
    {
      name: 'contextual typing limitation: Promise<string> annotated, await Promise.resolve("hello") returned — literal hidden by context',
      code: `async function greet(): Promise<string> { return await Promise.resolve("hello"); }`,
    },
    {
      name: 'async function returning another async function result with matching annotation',
      code: `
        async function inner(): Promise<"ok"> { return "ok"; }
        async function outer(): Promise<"ok"> { return inner(); }
      `,
    },
    {
      name: 'single literal return: Promise<string> matches widened "hello"',
      code: `async function greet(): Promise<string> { return "hello"; }`,
    },
    {
      name: 'single literal return: Promise<number> matches widened 42',
      code: `async function getCode(): Promise<number> { return 42; }`,
    },
    {
      name: 'PromiseLike<string> with single return — widened, no warning',
      code: `async function f(): PromiseLike<string> { return "ok"; }`,
    },
    {
      name: 'async function with exact literal union annotation matching inferred union — no warning',
      code: `
        async function getStatus(x: boolean): Promise<"a" | "b"> {
          if (x) return "a";
          return "b";
        }
      `,
    },
    {
      name: 'type alias for Promise — resolves to Promise, single return widened',
      code: `
        type ApiResponse<T> = Promise<T>;
        async function getName(): ApiResponse<string> { return "Alice"; }
      `,
    },
  ],
  invalid: [
    {
      name: "async with multiple returns: Promise<string> annotated, inferred Promise<'a' | 'b'>",
      code: `
        async function getStatus(x: boolean): Promise<string> {
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
        async function getStatus(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        async function getStatus(x: boolean): Promise<"a" | "b"> {
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
      name: 'Promise<string> annotated, returns another async function result typed Promise<"ok">',
      code: `
        async function inner(): Promise<"ok"> { return "ok"; }
        async function outer(): Promise<string> { return inner(); }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          data: {
            annotated: 'Promise<string>',
            inferred: 'Promise<"ok">',
          },
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        async function inner(): Promise<"ok"> { return "ok"; }
        async function outer() { return inner(); }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        async function inner(): Promise<"ok"> { return "ok"; }
        async function outer(): Promise<"ok"> { return inner(); }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'PromiseLike<string> wider than "a" | "b"',
      code: `
        async function f(x: boolean): PromiseLike<string> {
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
        async function f(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        async function f(x: boolean): PromiseLike<"a" | "b"> {
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
      name: 'interface extending Promise — wider than inferred',
      code: `
        interface ApiResponse<T> extends Promise<T> { }
        async function getStatus(x: boolean): ApiResponse<string> {
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
        interface ApiResponse<T> extends Promise<T> { }
        async function getStatus(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        interface ApiResponse<T> extends Promise<T> { }
        async function getStatus(x: boolean): ApiResponse<"a" | "b"> {
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
      name: 'message shows Promise<"a" | "b"> for multi-return async inferred type',
      code: `
        async function greet(x: boolean): Promise<string> {
          if (x) return "a";
          return "b";
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          data: {
            annotated: 'Promise<string>',
            inferred: 'Promise<"a" | "b">',
          },
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        async function greet(x: boolean) {
          if (x) return "a";
          return "b";
        }
      `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
        async function greet(x: boolean): Promise<"a" | "b"> {
          if (x) return "a";
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
