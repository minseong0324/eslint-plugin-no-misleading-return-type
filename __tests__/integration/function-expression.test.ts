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
      name: 'function expression without annotation',
      code: `const getStatus = function() { return "idle"; };`,
    },
    {
      name: 'function expression with matching return type',
      code: `const getStatus = function(): "idle" { return "idle"; };`,
    },
  ],
  invalid: [
    {
      name: "function expression: 'idle' annotated as string",
      code: `const getStatus = function(): string { return "idle"; };`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `const getStatus = function() { return "idle"; };`,
            },
          ],
        },
      ],
    },
    {
      name: 'function expression assigned to variable: number literal widening',
      code: `const getCode = function(): number { return 404; };`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `const getCode = function() { return 404; };`,
            },
          ],
        },
      ],
    },
    {
      name: 'object method function expression: string literal widening',
      code: `
        const obj = {
          getLabel: function(): string { return "foo"; },
        };
      `,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `
        const obj = {
          getLabel: function() { return "foo"; },
        };
      `,
            },
          ],
        },
      ],
    },
  ],
});
