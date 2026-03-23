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
      name: 'annotated type matches inferred type — no warning',
      code: `function getStatus(): "idle" { return "idle"; }`,
    },
    {
      name: 'no return type annotation',
      code: `function getStatus() { return "idle"; }`,
    },
    {
      name: 'void return type',
      code: `function logMessage(): void { console.log("hi"); }`,
    },
    {
      name: 'escape hatch: any',
      code: `function getVal(): any { return "idle"; }`,
    },
    {
      name: 'escape hatch: unknown',
      code: `function getVal(): unknown { return "idle"; }`,
    },
    {
      name: 'overload declaration signature (no body)',
      code: `
        function process(x: string): string;
        function process(x: number): number;
        function process(x: any): any { return x; }
      `,
    },
    {
      name: 'generic function with type parameter',
      code: `function identity<T>(x: T): T { return x; }`,
    },
    {
      name: 'recursive function',
      code: `
        function sum(n: number): number {
          if (n === 0) return 0;
          return n + sum(n - 1);
        }
      `,
    },
  ],
  invalid: [
    {
      name: "string literal widening: 'idle' annotated as string",
      code: `function getStatus(): string { return "idle"; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function getStatus() { return "idle"; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'number literal widening: 404 annotated as number',
      code: `function getCode(): number { return 404; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function getCode() { return 404; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'boolean literal widening: true annotated as boolean',
      code: `function isEnabled(): boolean { return true; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function isEnabled() { return true; }`,
            },
          ],
        },
      ],
    },
    {
      name: 'object widening: { retry: true } annotated as object',
      code: `function getConfig(): object { return { retry: true }; }`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `function getConfig() { return { retry: true }; }`,
            },
          ],
        },
      ],
    },
  ],
});
