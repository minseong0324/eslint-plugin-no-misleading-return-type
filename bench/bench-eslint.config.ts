import parser from '@typescript-eslint/parser';
import plugin from '../src/index.js';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.ts'],
          defaultProject: '../tsconfig.json',
        },
      },
    },
    plugins: {
      'no-misleading-return-type': plugin,
    },
    rules: {
      'no-misleading-return-type/no-misleading-return-type': 'warn',
    },
  },
];
