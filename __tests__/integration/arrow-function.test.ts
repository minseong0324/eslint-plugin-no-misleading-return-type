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
      name: 'concise body with matching return type — no warning',
      code: `const getLabel = (): "label" => "label";`,
    },
    {
      name: 'block body with matching return type — no warning',
      code: `const getLabel = (): "label" => { return "label"; };`,
    },
    {
      name: 'concise body without annotation',
      code: `const getLabel = () => "label";`,
    },
    {
      name: 'block body without annotation',
      code: `const getLabel = () => { return "label"; };`,
    },
    {
      name: 'void return',
      code: `const log = (): void => { console.log("hi"); };`,
    },
  ],
  invalid: [
    {
      name: "concise body: 'label' annotated as string",
      code: `const getLabel = (): string => "label";`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `const getLabel = () => "label";`,
            },
          ],
        },
      ],
    },
    {
      name: "block body: 'label' annotated as string",
      code: `const getLabel = (): string => { return "label"; };`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `const getLabel = () => { return "label"; };`,
            },
          ],
        },
      ],
    },
    {
      name: 'number literal widening in concise body',
      code: `const getCode = (): number => 404;`,
      errors: [
        {
          messageId: 'misleadingReturnType',
          suggestions: [
            {
              messageId: 'removeReturnType',
              output: `const getCode = () => 404;`,
            },
          ],
        },
      ],
    },
  ],
});
