import { noMisleadingReturnType } from '../../src/rules/no-misleading-return-type.js';
import { ruleTester } from './_setup.js';

ruleTester.run('no-misleading-return-type', noMisleadingReturnType, {
  valid: [
    {
      name: 'override method with wider return type (single literal) → skip',
      code: `
    class Base {
      getStatus(): string { return 'idle'; }
    }
    class Child extends Base {
      override getStatus(): string {
        if (Math.random() > 0.5) return 'active';
        return 'inactive';
      }
    }
  `,
    },
    {
      name: 'override method with wider return type (intentional) → skip',
      code: `
    abstract class Base {
      abstract getValue(): string | number;
    }
    class Child extends Base {
      override getValue(): string | number { return 42; }
    }
  `,
    },
    {
      name: 'override method with multi-return → skip',
      code: `
    class Base {
      getLabel(x: boolean): string {
        const labels: string[] = ['a', 'b'];
        return x ? labels[0] : labels[1];
      }
    }
    class Child extends Base {
      override getLabel(x: boolean): string {
        if (x) return 'yes';
        return 'no';
      }
    }
  `,
    },
    {
      name: 'async override method with wider return type → skip',
      code: `
        class Base {
          async fetchData(): Promise<string> { return 'default'; }
        }
        class Child extends Base {
          override async fetchData(): Promise<string> {
            if (Math.random() > 0.5) return 'cached';
            return 'fetched';
          }
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'non-override method with wider return type → warns',
      code: `
    class Foo {
      getLabel(x: boolean): string {
        if (x) return "a";
        return "b";
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
      getLabel(x: boolean) {
        if (x) return "a";
        return "b";
      }
    }
  `,
            },
            {
              messageId: 'narrowReturnType',
              output: `
    class Foo {
      getLabel(x: boolean): "a" | "b" {
        if (x) return "a";
        return "b";
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
