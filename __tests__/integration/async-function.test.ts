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
  ],
  invalid: [
    {
      name: "Promise<string> annotated, inferred Promise<'hello'>",
      code: `async function greet(): Promise<string> { return "hello"; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `async function greet() { return "hello"; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'Promise<number> annotated, inferred Promise<42>',
      code: `async function getCode(): Promise<number> { return 42; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `async function getCode() { return 42; }`,
            },
          ],
        },
      ],
    },
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
          ],
        },
      ],
    },
    {
      name: 'message shows Promise<"hello"> not just "hello" for inferred type',
      code: `async function greet(): Promise<string> { return "hello"; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          data: {
            annotated: 'Promise<string>',
            inferred: 'Promise<"hello">',
          },
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `async function greet() { return "hello"; }`,
            },
          ],
        },
      ],
    },
  ],
});
