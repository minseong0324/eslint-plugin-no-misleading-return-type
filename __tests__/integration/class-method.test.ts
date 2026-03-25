import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    {
      name: 'class method with matching return type — no warning',
      code: `
        class Foo {
          getKey(): "foo" { return "foo"; }
        }
      `,
    },
    {
      name: 'abstract method',
      code: `
        abstract class Foo {
          abstract getKey(): string;
        }
      `,
    },
    {
      name: 'generic method',
      code: `
        class Foo {
          identity<T>(x: T): T { return x; }
        }
      `,
    },
    {
      name: 'void return',
      code: `
        class Foo {
          log(): void { console.log("hi"); }
        }
      `,
    },
    {
      name: 'getter method skip (v1)',
      code: `
        class Foo {
          get label(): string { return "foo"; }
        }
      `,
    },
    {
      name: 'setter method skip (v1)',
      code: `
        class Foo {
          set label(v: string) { }
        }
      `,
    },
    {
      name: 'single literal return: instance method matches widened',
      code: `
        class Foo {
          getKey(): string { return "foo"; }
        }
      `,
    },
    {
      name: 'single literal return: static method matches widened',
      code: `
        class Foo {
          static getLabel(): string { return "bar"; }
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'multi-return instance method: string wider than "foo" | "bar"',
      code: `
        class Foo {
          getKey(x: boolean): string {
            if (x) return "foo";
            return "bar";
          }
        }
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        class Foo {
          getKey(x: boolean) {
            if (x) return "foo";
            return "bar";
          }
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
