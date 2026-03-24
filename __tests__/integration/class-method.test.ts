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
  ],
  invalid: [
    {
      name: 'instance method widening',
      code: `
        class Foo {
          getKey(): string { return "foo"; }
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
          getKey() { return "foo"; }
        }
      `,
            },
          ],
        },
      ],
    },
    {
      name: 'static method widening',
      code: `
        class Foo {
          static getLabel(): string { return "bar"; }
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
          static getLabel() { return "bar"; }
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
