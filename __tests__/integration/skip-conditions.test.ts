import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    // annotation / body
    {
      name: 'no return type annotation → skip',
      code: `function foo() { return "idle"; }`,
    },
    {
      name: 'overload declaration (no body) → skip',
      code: `
        function process(x: string): string;
        function process(x: number): number;
        function process(x: any): any { return x; }
      `,
    },
    {
      name: 'abstract method → skip',
      code: `
        abstract class Foo {
          abstract getValue(): string;
        }
      `,
    },

    // escape hatch
    {
      name: 'escape hatch: any → skip',
      code: `function foo(): any { return "idle"; }`,
    },
    {
      name: 'escape hatch: unknown → skip',
      code: `function foo(): unknown { return "idle"; }`,
    },
    {
      name: 'escape hatch: never → skip',
      code: `function foo(): never { throw new Error(); }`,
    },
    {
      name: 'escape hatch: void → skip',
      code: `function foo(): void { console.log("hi"); }`,
    },

    // getter / setter
    {
      name: 'getter method → skip (v1)',
      code: `
        class Foo {
          get label(): string { return "foo"; }
        }
      `,
    },
    {
      name: 'setter method → skip (v1)',
      code: `
        class Foo {
          private _v = "";
          set label(v: string) { this._v = v; }
        }
      `,
    },

    // generics / generators
    {
      name: 'function with type parameters → skip',
      code: `function wrap<T>(x: T): T { return x; }`,
    },
    {
      name: 'generator function → skip',
      code: `function* gen(): Generator<number> { yield 1; yield 2; }`,
    },

    // ambient
    {
      name: 'declare function → skip',
      code: `declare function foo(): string;`,
    },

    // recursive functions
    // The rule catches circular type resolution via catch { return; }.
    // These cases are documented as v1 limitations (see docs/rules/no-misleading-return-type.md).
    {
      name: 'direct recursive function → skip (circular type resolution)',
      code: `
        function fib(n: number): number {
          if (n <= 1) return n;
          return fib(n - 1) + fib(n - 2);
        }
      `,
    },
    {
      name: 'mutual recursion (isEven/isOdd) → skip (circular type resolution)',
      code: `
        function isEven(n: number): boolean { return n === 0 ? true : isOdd(n - 1); }
        function isOdd(n: number): boolean { return n === 0 ? false : isEven(n - 1); }
      `,
    },

    // inferred type reliability
    {
      name: 'inferred type contains any → skip',
      code: `
        function wrap(x: any): string { return x; }
      `,
    },
    {
      name: 'inferred type contains any in union (string | any) → skip',
      code: `
        function getVal(x: any): string | number { return x; }
      `,
    },

    // void / implicit undefined
    {
      name: 'void function (no return statements) → skip',
      code: `function log(): void { console.log("hi"); }`,
    },
    {
      name: 'annotated has undefined but inferred does not → skip (implicit undefined heuristic)',
      code: `
        function find(items: string[], id: string): string | undefined {
          return items.find(item => item === id);
        }
      `,
    },
    {
      name: 'annotated has undefined and inferred also has undefined → does NOT skip',
      // This one WOULD produce a warning IF the annotation is wider — but here annotation is "idle" | undefined
      // and inferred is string | undefined (from find), so actually this depends on the type inference.
      // Use a case where it's valid: annotation matches inferred including undefined
      code: `
        function maybeGet(flag: boolean): "found" | undefined {
          if (flag) return "found";
          return undefined;
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'constructor return expression does not contaminate outer function inferred type',
      // Without the isConstructorDeclaration guard in isFunctionLike, collectReturnTypes would
      // traverse into the constructor and collect Object.create(null) (type: any).
      // any contaminates the union → containsAny check → no warning (false negative).
      // With the fix, constructor is blocked, outer infers "hello" → string > "hello" → warns.
      code: `
        function outer(): string {
          class Inner {
            constructor() { return Object.create(null); }
          }
          return 'hello';
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        function outer() {
          class Inner {
            constructor() { return Object.create(null); }
          }
          return 'hello';
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
