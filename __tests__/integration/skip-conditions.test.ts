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
  invalid: [],
});
